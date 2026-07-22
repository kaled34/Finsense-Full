import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GroupsService } from './groups.service';
import { UseGuards, forwardRef, Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat' // We will connect to /chat
})
export class GroupsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => GroupsService))
    private readonly groupsService: GroupsService
  ) {}

  handleConnection(_client: Socket) {
    // Silent connection
  }

  handleDisconnect(_client: Socket) {
    // Silent disconnection
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, room: string) {
    client.join(room);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(client: Socket, room: string) {
    client.leave(room);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string; userId: string; content: string }
  ) {
    try {
      // Guardar en la base de datos usando el GroupsService
      const savedMessage = await this.groupsService.saveMessage(
        data.userId,
        data.groupId,
        data.content
      );

      // Emitir a todos en la sala (incluyendo al remitente)
      const room = `group_${data.groupId}`;
      this.server.to(room).emit('newMessage', savedMessage);

      // Emitir global notification a todos los miembros (excepto remitente)
      try {
        const group = await this.groupsService.findOne(data.userId, data.groupId);
        if (group && group.members) {
          group.members.forEach(m => {
            if (m.userId !== data.userId) {
              this.emitGlobalNotification(m.userId, 'group_message', {
                groupId: data.groupId,
                groupName: group.name,
                senderName: savedMessage.sender.name,
                content: savedMessage.content
              });
            }
          });
        }
      } catch (e) {
        console.error('Error emitting global msg notif', e);
      }
      
    } catch (error) {
      console.error('Error saving message via WS:', error);
      client.emit('error', { message: 'Could not send message' });
    }
  }

  @SubscribeMessage('joinUserRoom')
  handleJoinUserRoom(client: Socket, userId: string) {
    if (userId) {
      client.join(`user_${userId}`);
    }
  }

  // Método auxiliar para que el GroupsService o Controller lo llamen
  emitGlobalNotification(userId: string, type: string, message: any) {
    this.server.to(`user_${userId}`).emit('globalNotification', { type, message });
  }
}

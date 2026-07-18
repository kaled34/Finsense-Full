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
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat' // We will connect to /chat
})
export class GroupsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly groupsService: GroupsService) {}

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

      // Emitir a todos en la sala (incluyendo al remitente, o el cliente puede añadirlo optimísticamente)
      const room = `group_${data.groupId}`;
      this.server.to(room).emit('newMessage', savedMessage);
      
    } catch (error) {
      console.error('Error saving message via WS:', error);
      client.emit('error', { message: 'Could not send message' });
    }
  }
}

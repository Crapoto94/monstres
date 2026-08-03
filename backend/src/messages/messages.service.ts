import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SettingsService } from '../settings/settings.service';
import { resolveAvatarUrl } from '../common/avatar.util';

/**
 * Messagerie interne (Phase 11) : conversations 1:1 entre utilisateurs.
 *
 * Conventions :
 * - Une conversation relie exactement deux utilisateurs, stockés de façon
 *   ordonnée (`participantAId < participantBId`) pour garantir l'unicité du
 *   couple via la contrainte @@unique([participantAId, participantBId]).
 * - Un message est lu (readAt renseigné) uniquement par le destinataire.
 * - Un nouveau message déclenche un email de notification au destinataire
 *   SEULEMENT s'il a activé `messageEmailNotifications` (indépendant du
 *   toggle des alertes système, cf. §9 RGPD) — le lien de l'email pointe
 *   vers la messagerie interne.
 */
@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  private resolveAvatar(avatar: string | null): string | null {
    const imgBaseUrl = this.config.get<string>(
      'IMG_BASE_URL',
      'http://localhost:3000/uploads',
    );
    return resolveAvatarUrl(avatar, imgBaseUrl);
  }

  private assertParticipant(
    conversation: { participantAId: string; participantBId: string },
    userId: string,
  ) {
    if (
      conversation.participantAId !== userId &&
      conversation.participantBId !== userId
    ) {
      throw new NotFoundException('Conversation introuvable.');
    }
  }

  /** Retrouve une conversation existante entre deux utilisateurs, ou la crée. */
  async findOrCreateConversation(userId: string, recipientId: string) {
    if (userId === recipientId) {
      throw new BadRequestException('Impossible de discuter avec soi-même.');
    }

    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, name: true },
    });
    if (!recipient) throw new NotFoundException('Utilisateur introuvable.');

    const [participantAId, participantBId] = [userId, recipientId].sort();

    const conversation = await this.prisma.conversation.upsert({
      where: {
        participantAId_participantBId: { participantAId, participantBId },
      },
      create: { participantAId, participantBId },
      update: {},
      select: { id: true },
    });

    return {
      id: conversation.id,
      recipient: { id: recipient.id, name: recipient.name },
    };
  }

  /** Liste des conversations de l'utilisateur, avec le dernier message et le nombre de non-lus. */
  async findMyConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ participantAId: userId }, { participantBId: userId }],
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        participantA: { select: { id: true, name: true, avatar: true } },
        participantB: { select: { id: true, name: true, avatar: true } },
      },
    });

    return Promise.all(
      conversations.map(async (conversation) => {
        const other =
          conversation.participantAId === userId
            ? conversation.participantB
            : conversation.participantA;

        const [lastMessage, unreadCount] = await Promise.all([
          this.prisma.message.findFirst({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: 'desc' },
            select: { content: true, createdAt: true, senderId: true },
          }),
          this.prisma.message.count({
            where: {
              conversationId: conversation.id,
              senderId: { not: userId },
              readAt: null,
            },
          }),
        ]);

        return {
          id: conversation.id,
          otherUser: {
            id: other.id,
            name: other.name,
            avatar: this.resolveAvatar(other.avatar),
          },
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                createdAt: lastMessage.createdAt,
                fromMe: lastMessage.senderId === userId,
              }
            : null,
          unreadCount,
          lastMessageAt: conversation.lastMessageAt,
        };
      }),
    );
  }

  /** Messages d'une conversation (tri chronologique), si l'utilisateur en est participant. */
  async findMessages(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation introuvable.');
    this.assertParticipant(conversation, userId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        senderId: true,
        readAt: true,
      },
    });

    return messages.map((message) => ({
      ...message,
      fromMe: message.senderId === userId,
    }));
  }

  /** Envoie un message dans une conversation, et notifie le destinataire par email s'il a opté. */
  async sendMessage(conversationId: string, userId: string, content: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participantA: {
          select: {
            id: true,
            name: true,
            email: true,
            messageEmailNotifications: true,
          },
        },
        participantB: {
          select: {
            id: true,
            name: true,
            email: true,
            messageEmailNotifications: true,
          },
        },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation introuvable.');
    this.assertParticipant(conversation, userId);

    const message = await this.prisma.message.create({
      data: { conversationId, senderId: userId, content },
      select: { id: true, content: true, createdAt: true, senderId: true },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    const recipient =
      conversation.participantAId === userId
        ? conversation.participantB
        : conversation.participantA;
    const sender =
      conversation.participantAId === userId
        ? conversation.participantA
        : conversation.participantB;

    if (recipient.messageEmailNotifications) {
      try {
        const frontendUrl = this.config.get<string>(
          'FRONTEND_URL',
          'http://localhost:5173',
        );
        await this.emailService.sendNewMessageNotification({
          to: recipient.email,
          recipientName: recipient.name,
          senderName: sender.name,
          preview: content,
          conversationUrl: `${frontendUrl}/messages?conversation=${conversationId}`,
        });
      } catch (error) {
        this.logger.error(
          `Échec envoi email de messagerie à ${recipient.email}`,
          error as Error,
        );
      }
    }

    return {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      fromMe: true,
    };
  }

  /** Marque tous les messages d'une conversation comme lus (pour l'utilisateur courant). */
  async markAsRead(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation introuvable.');
    this.assertParticipant(conversation, userId);

    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });

    return { read: true };
  }

  /** Nombre total de messages non lus, toutes conversations confondues. */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        readAt: null,
        senderId: { not: userId },
        conversation: {
          OR: [{ participantAId: userId }, { participantBId: userId }],
        },
      },
    });
    return { count };
  }

  /**
   * Destinataire du bouton « Écrire au Monstre » : le compte dont l'email
   * correspond au setting `admin_notification_email` (déjà utilisé ailleurs
   * comme email de contact admin, cf. AuthService — même compte, pas de
   * nouvelle règle en dur). À défaut (email introuvable/pas de compte
   * associé), on retombe sur le SUPER_ADMIN le plus ancien, puis un ADMIN.
   */
  async findSupportRecipient(userId: string) {
    const contactEmail = await this.settings.getString(
      'admin_notification_email',
      'admin@fbc.fr',
    );
    const byEmail = await this.prisma.user.findUnique({
      where: { email: contactEmail },
      select: { id: true, name: true },
    });
    if (byEmail && byEmail.id !== userId) return byEmail;

    const admin = await this.prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN', id: { not: userId } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    });
    if (admin) return admin;

    const fallback = await this.prisma.user.findFirst({
      where: { role: 'ADMIN', id: { not: userId } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    });
    if (!fallback) {
      throw new NotFoundException('Aucun administrateur disponible.');
    }
    return fallback;
  }
}

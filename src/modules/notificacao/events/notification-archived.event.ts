export class NotificationArchivedEvent {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
    public readonly archivedAt: Date,
  ) {}
}

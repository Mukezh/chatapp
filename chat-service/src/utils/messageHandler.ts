import { UserStatusStore } from "./userStatusStore";
import { rabbitMQService } from "../services/RabbitMQService";

const userStatusStore = UserStatusStore.getInstance();

export const handleMessageReceived = async (
    senderName: string,
    senderEmail: string,
    receiverId: string,
    messageContent: string
) => {
    const receiverIsOnline = userStatusStore.isUserOnline(receiverId);
    console.log('receiver is offline',receiverIsOnline);
    if(receiverIsOnline) {

        await rabbitMQService.notifyReceiver (
            receiverId,
            messageContent,
            senderEmail,
            senderName
        );
    }
};
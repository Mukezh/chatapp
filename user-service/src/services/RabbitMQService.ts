import amqp, { Connection, Channel }  from 'amqplib';
import config from '../config/config';
import { User } from '../database';
import { ApiError } from '../utils';


class RabbitMQService {
    private requestQueue = "USER_DETAILS_REQUEST";
    private responseQueue = "USER_DETAILS_RESPONSE";
    private userStatusQueue = "USER_STATUS_UPDATE";
    private connection: any;
    private channel: any;

    private constructor() {}

    static async createInstance() {
        const instance = new RabbitMQService();
        await instance.init();
        return instance;
    }

    private async init() {
        try {
            this.connection = await amqp.connect(config.msgBrokerURL!);
            this.channel = await this.connection.createChannel();

            await this.channel.assertQueue(this.requestQueue, { durable: true });
            await this.channel.assertQueue(this.responseQueue, { durable: true });

            await this.listenForRequest();
            console.log('RabbitMQService initialized and listening for requests.');
        } catch (err) {
            console.error('RabbitMQ initialization error:', err);
        }
    }

    async sendUserStatusUpdate(userId: string, isOnline:boolean) {
        if(!this.channel) throw new Error('Channel is not initialized');
        const payload = {
            userId, 
            isOnline, 
            type: "USER_STATUS_UPDATE"
        };
        await this.channel.assertQueue(this.userStatusQueue, { durable: true});
        this.channel.sendToQueue(
            this.userStatusQueue,
            Buffer.from(JSON.stringify(payload))
        );
    }

    private async listenForRequest() {
        if (!this.channel) throw new Error('Channel not initialized');
        this.channel.consume(this.requestQueue, async (msg: any) => {
            try {
                if (msg && msg.content) {
                    const { userId } = JSON.parse(msg.content.toString());
                    const userDetails = await getUserDetails(userId);

                    this.channel!.sendToQueue(
                        this.responseQueue,
                        Buffer.from(JSON.stringify(userDetails)),
                        { correlationId: msg.properties.correlationId }
                    );
                }
                this.channel!.ack(msg);
            } catch (err) {
                console.error('Error processing message:', err);
                if (msg) this.channel!.nack(msg, false, false); // discard message
            }
        });
    }

    async close() {
        try {
            if (this.channel) await this.channel.close();
            if (this.connection) await this.connection.close();
            console.log('RabbitMQService connection closed.');
        } catch (err) {
            console.error('Error closing RabbitMQ connection:', err);
        }
    }
}


const getUserDetails = async (userId: string) => {
    try {
        const userDetails = await User.findById(userId).select("-password");
        if (!userDetails) {
            throw new ApiError(404, "User not found");
        }
        return userDetails;
    } catch (err) {
        throw new ApiError(500, "Database error");
    }
}


// Usage: await RabbitMQService.createInstance() in your server startup
let rabbitMQService: RabbitMQService | null = null;
export const initializeRabbitMQService = async () => {
    rabbitMQService = await RabbitMQService.createInstance();
    // Optionally handle shutdown
    process.on('SIGINT', async () => {
        if (rabbitMQService) await rabbitMQService.close();
        process.exit(0);
    });
};
export { rabbitMQService };


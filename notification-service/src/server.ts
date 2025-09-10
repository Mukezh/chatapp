import express, { Express } from "express";
import { Server } from "http";
import { errorConvertor, errorHandler } from "./middleware";
import config from "./config/config";
 import { rabbitMQService } from "./services/RabbitMQService";


const app: Express = express();
let server: Server;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(errorConvertor);
app.use(errorHandler);

server = app.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT}`)
});

const initializeRabbitMQClient = async () => {
    try {
        await rabbitMQService.init();
        console.log("Rabbit is connected and working")
    }
    catch(error) {
        console.error("rabbit is not connected", error);
    }
} 

initializeRabbitMQClient();


const exitHandler = () => {
    if(server) {
        server.close(() => {
            console.info("server closed");
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
};

const unexpectedErrorHandler = (error: unknown) => {
    console.error(error);
    exitHandler();
}


process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);
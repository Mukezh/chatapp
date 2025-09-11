# Application Workflow

Below is a Mermaid flowchart describing how requests and events move through the gateway, services, databases, and RabbitMQ queues.

```mermaid
flowchart LR
    %% Clients and Gateway
    client[Client (Web/Mobile)] -->|HTTP /api/auth| gw[Gateway (Express Proxy: 8080)]
    client -->|HTTP /api/messages| gw
    client -->|WebSocket (Socket.IO)| chat(Chat Service 8082)

    %% Proxy routes
    gw -->|/api/auth| user(User Service 8081)
    gw -->|/api/messages| chat
    gw -->|/api/notifications| notif(Notification Service 8083)

    %% User Service flows
    subgraph US[User Service]
        user -->|/register| usrDB[(MongoDB: Users)]
        user -->|/login| login[AuthController.login]
        login -->|validate creds| usrDB
        login -->|issue JWT cookie + token| client
        login -->|send USER_STATUS_UPDATE| mq[(RabbitMQ)]
        mq -->|consume USER_DETAILS_REQUEST| udq[Lookup User Details]
        udq --> usrDB
        udq -->|send USER_DETAILS_RESPONSE (corrId)| mq
    end

    %% Chat Service flows
    subgraph CS[Chat Service]
        chat -->|POST /send| send[MessageController.send]
        chat -->|GET /get/:receiverId| getConv[MessageController.getConversation]
        send --> msgDB[(MongoDB: Messages)]
        getConv --> msgDB
        send --> handler[handleMessageReceived]
        handler -->|check receiver online?| statusStore[UserStatusStore]
        mq -->|USER_STATUS_UPDATE| statusUpd[Update UserStatusStore]
        statusUpd --> statusStore
        handler -->|offline -> request user details| reqUser[RabbitMQService.requestUserDetails]
        reqUser --> mq
        mq -->|USER_DETAILS_RESPONSE (corrId)| reqUser
        reqUser -->|enqueue NOTIFICATIONS| mq
        %% WebSocket realtime
        client <-->|sendMessage / receiveMessage| chat
    end

    %% Notification Service flows
    subgraph NS[Notification Service]
        mq -->|NOTIFICATIONS| consume[Consume NOTIFICATIONS]
        consume --> nsStatus[UserStatusStore]
        consume -->|if online & token| push[FCM (future)]
        consume -->|else email| email[EmailService]
        email --> smtp[(SMTP Provider)]
    end

    %% Styling
    classDef svc fill:#eef,stroke:#447,stroke-width:1px
    classDef db fill:#efe,stroke:#474,stroke-width:1px
    classDef mq fill:#fee,stroke:#744,stroke-width:1px
    class gw,client svc
    class user,chat,notif,login,send,getConv,handler,reqUser,consume,push,email svc
    class usrDB,msgDB db
    class mq mq
```

Key interactions
- HTTP
  - Gateway proxies: /api/auth -> user-service, /api/messages -> chat-service, /api/notifications -> notification-service
  - user-service: POST /register, POST /login
  - chat-service: POST /send, GET /get/:receiverId
- WebSocket
  - chat-service handles sendMessage and emits receiveMessage
- Queues (RabbitMQ)
  - USER_STATUS_UPDATE: published by user-service on login; consumed by chat-service to update UserStatusStore
  - USER_DETAILS_REQUEST -> USER_DETAILS_RESPONSE: chat-service requests receiver details; user-service responds with correlationId
  - NOTIFICATIONS: published by chat-service to trigger user notifications; consumed by notification-service
- Persistence
  - MongoDB: Users (user-service), Messages (chat-service)
- Notifications
  - Email via SMTP; Push (FCM) scaffolding present but currently disabled


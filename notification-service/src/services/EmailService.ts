import nodemailer from 'nodemailer';
import config from '../config/config';

export class EmailService {
    private transporter;
    
    constructor() {
        this.transporter = nodemailer.createTransport( {
            host: config.smtp.host,
            port: config.smtp.port,
            secure: false,
            auth: {
                user: config.smtp.user,
                pass: config.smtp.pass,
            },
            logger:true,
            debug: true,
        });
        console.log("config data is",config.smtp);
    }

    
    
    async sendEmail ( to: string, subject: string, content: string) {

        
        console.log('here is the content : ', content);
        const mailOptions = {
            from: config.EMAIL_FROM,
            to: to,
            subject: subject,
            html: content,
        };

        console.log("mail options: ", mailOptions);

        try {
            await this.transporter.verify();
            console.log("verified");
            // const info = await this.transporter.sendMail(mailOptions);
            // console.log("Email sent: %s", info.messageId);
        }
        catch(error) {
            console.error("Error sending email: %s", error);
        }
    }
}
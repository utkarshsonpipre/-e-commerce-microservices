import nodemailer, { Transporter } from 'nodemailer';
import { createLogger } from '@ecommerce/common';
import { config } from './config';

const log = createLogger('notifications:mailer');

export interface Email {
  to: string;
  subject: string;
  body: string;
}

export interface Mailer {
  send(email: Email): Promise<void>;
}

/** Dev mailer: just logs the email. Default transport. */
class LogMailer implements Mailer {
  async send(email: Email): Promise<void> {
    log.info({ to: email.to, subject: email.subject }, `📧 [LOG MAILER] ${email.subject} → ${email.to}`);
  }
}

/** SMTP mailer via nodemailer (e.g. pointed at Mailhog in dev). */
class SmtpMailer implements Mailer {
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: false,
    });
  }

  async send(email: Email): Promise<void> {
    await this.transporter.sendMail({
      from: config.mailFrom,
      to: email.to,
      subject: email.subject,
      text: email.body,
    });
    log.info({ to: email.to, subject: email.subject }, 'Email sent via SMTP');
  }
}

export const mailer: Mailer = config.mailTransport === 'smtp' ? new SmtpMailer() : new LogMailer();

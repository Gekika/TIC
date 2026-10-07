package com.tic.service;

import com.tic.config.TicProperties;
import com.tic.exception.ExternalServiceException;
import com.tic.model.enums.AccountTokenPurpose;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/** Sends the account emails (invitation, password reset). SMTP settings come from spring.mail.*. */
@Service
public class EmailService {
    public static final String SMTP_AUTH_FAILED = "SMTP_AUTHENTICATION_FAILED";
    public static final String EMAIL_FAILED = "INVITATION_EMAIL_FAILED";

    private final JavaMailSender mailSender;
    private final String from;

    public EmailService(JavaMailSender mailSender, TicProperties properties) {
        this.mailSender = mailSender;
        this.from = properties.mail().from();
    }

    /** @throws ExternalServiceException (502) if the SMTP server rejects or cannot be reached */
    public void sendAccountLink(String to, AccountTokenPurpose purpose, String link, String expiryLabel) {
        boolean invitation = purpose == AccountTokenPurpose.INVITATION;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(invitation ? "You are invited to TIC Operations" : "Reset your TIC Operations password");
        message.setText(invitation
                ? "You have been invited to the TIC Operations Portal.\n\nCreate your profile and password using this secure link:\n" + link
                + "\n\nThis link expires in " + expiryLabel + ". If you were not expecting this invitation, you can ignore this email."
                : "A password reset was requested for your TIC Operations account.\n\nSet a new password using this secure link:\n" + link
                + "\n\nThis link expires in " + expiryLabel + ". If you did not request this change, you can ignore this email.");
        try {
            mailSender.send(message);
        } catch (MailAuthenticationException exception) {
            throw new ExternalServiceException(SMTP_AUTH_FAILED,
                    "The email could not be sent because the configured email credentials were rejected. Update the SMTP (e.g. Gmail app) password and retry.");
        } catch (MailException exception) {
            throw new ExternalServiceException(EMAIL_FAILED,
                    "The email could not be sent. Check the SMTP connection settings and retry.");
        }
    }
}

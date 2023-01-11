import sendgrid from '@sendgrid/mail';
import { envs as ENVS } from '../env';

sendgrid.setApiKey(ENVS.SENDGRID_API_KEY);

export async function sendEmail({
    subject,
    from,
    to,
    templateId,
    dynamicData,
}: {
    subject?: string;
    from?: string;
    to: string;
    templateId: string;
    dynamicData: { [key: string]: string | number } | undefined;
}) {
    try {
        await sendgrid.send({
            from: from ?? ENVS.SENDGRID_DEFAULT_SENDER,
            templateId,
            personalizations: [
                {
                    to: { email: to },
                    dynamicTemplateData: dynamicData,
                    subject,
                },
            ],
        });

        return [null, null];
    } catch (err) {
        return [err, null];
    }
}

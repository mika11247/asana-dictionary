import { Resend } from 'resend'
import { handleContact } from '../../../lib/contact-handler.mjs'

export async function GET() {
  return Response.json({ ok: true, message: 'contact api is working' })
}

export async function POST(request) {
  // Vercel WAF limits POST requests before they reach this handler.
  return handleContact(request, ({ category, name, email, message }) => {
    const resend = new Resend(process.env.RESEND_API_KEY)
    return resend.emails.send({
      from: 'M.glitter <noreply@mglitter.net>',
      to: 'mglitter.info@gmail.com',
      subject: `【Asana Dictionary】お問い合わせ：${category}`,
      replyTo: email,
      text: [
        '【Asana Dictionary】お問い合わせ',
        `■ 種別\n${category}`,
        ...(name ? [`■ お名前\n${name}`] : []),
        `■ 返信先メールアドレス\n${email}`,
        `■ お問い合わせ内容\n${message}`,
      ].join('\n\n'),
    })
  })
}

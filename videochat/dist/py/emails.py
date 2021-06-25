from email.mime.text import MIMEText
from email.MIMEMultipart import MIMEMultipart
from email.MIMEBase import MIMEBase
from email.MIMEText import MIMEText
from email.Utils import COMMASPACE, formatdate
from email.utils import make_msgid 
from email import Encoders

import logging
import smtplib
import webapp2

class SendInvitation(webapp2.RequestHandler):
  def post(self):
    messageFromRequest = self.request.get('message')
    receiver = self.request.get('email')
    calendarData = self.request.get('calendar')
    dateTime = self.request.get('dateTime')
    attachCalendar = self.request.get('attachCalendar')
    sender_address = 'Quick Hellou <no-reply@quickhellou.com>'
    subject = self.request.get('subject')
    logging.info('Subject: ' + str(subject))
    logging.info('Receiver: ' + str(receiver))
    logging.info('Calendar: ' + str(calendarData))
    logging.info('Attach Calendar: ' + str(attachCalendar))
    msg = MIMEMultipart('mixed')
    msg['From'] = sender_address
    msg['To'] = receiver
    msg['Date'] = formatdate(localtime=True)
    msg["Message-Id"] = make_msgid()  
    msg['Subject'] = subject    
    text = "You've got a Quick Hellou invitation."
    html = """
    <html><head></head><body>
    """ +messageFromRequest.strip()+ """
    </body></html>"""
    if dateTime != "":
      logging.info("populating new html")
      html = """
      <html>
      <head></head>
      <body>
        <p>You've got a talk invitation.</p><br>
        <div>Description: """ +messageFromRequest.strip()+ """</div><br/>
        <p>Scheduled time: """ +str(dateTime)+ """</p><br/>
      </body>
      </html>
      """
    textual_message = MIMEMultipart('alternative')
    part1 = MIMEText(text, 'plain')
    part2 = MIMEText(html.encode("ascii", errors="ignore"), 'html')
    textual_message.attach(part1)
    textual_message.attach(part2)
    msg.attach(textual_message)
    if attachCalendar.lower() in ("true"):
      attachment = MIMEText(calendarData)
      attachment.add_header('Content-Disposition', 'attachment', filename='calendar.csv')
      msg.attach(attachment)
    smtp = smtplib.SMTP("localhost")
    smtp.sendmail("no-reply@quickhellou.com", receiver, msg.as_string())
    smtp.quit()
    self.response.out.write('Your invitation has been sent.')
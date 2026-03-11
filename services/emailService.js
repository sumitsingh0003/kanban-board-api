const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  requireTLS: true,
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Logger function
const logEmail = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [EMAIL] [${level.toUpperCase()}] ${message}`, Object.keys(data).length ? data : '');
};

exports.sendAssignmentEmail = async (task, assignedUser, assignedBy, action = 'assigned') => {
  try {
    if (!assignedUser?.email) {
      logEmail('warn', 'No email provided for user', { userId: assignedUser?._id });
      return;
    }

    const subject = action === 'assigned' 
      ? `📋 Task Assigned to You - KAN-${task.taskNumber}`
      : `📋 Task Updated - KAN-${task.taskNumber}`;

    const text = `
      Hello ${assignedUser.name},

      You have been ${action} a task on Kanban Board.

      Task Details:
      ─────────────────
      Task ID: KAN-${task.taskNumber}
      Title: ${task.title}
      Priority: ${task.priority}
      Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}
      Status: ${task.status}
      
      ${action === 'assigned' ? `Assigned by: ${assignedBy.name} (${assignedBy.email})` : `Updated by: ${assignedBy.name} (${assignedBy.email})`}

      Please log in to your dashboard to view and manage this task:
      https://kan-ban-board-ai.vercel.app/dashboard/tasks

      Thanks,
      Kanban Board Team
    `;

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px;">
        <div style="background: white; padding: 30px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #333; margin-bottom: 5px;">📋 Task ${action === 'assigned' ? 'Assigned' : 'Updated'}</h1>
            <p style="color: #666;">Hello <strong>${assignedUser.name}</strong>,</p>
          </div>
          
          <div style="background: #f0f4ff; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
            <h3 style="color: #4f46e5; margin-top: 0; margin-bottom: 15px;">Task Details</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 100px;"><strong>Task ID:</strong></td>
                <td style="padding: 8px 0; color: #333;">KAN-${task.taskNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Title:</strong></td>
                <td style="padding: 8px 0; color: #333;">${task.title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Priority:</strong></td>
                <td style="padding: 8px 0;">
                  <span style="background: ${
                    task.priority === 'high' ? '#ef4444' : 
                    task.priority === 'medium' ? '#f59e0b' : '#10b981'
                  }; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                    ${task.priority.toUpperCase()}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Due Date:</strong></td>
                <td style="padding: 8px 0; color: #333;">
                  ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : 'Not set'}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Status:</strong></td>
                <td style="padding: 8px 0; color: #333;">${task.status}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="color: #666; margin: 0;">
              <strong>${action === 'assigned' ? 'Assigned by:' : 'Updated by:'}</strong> ${assignedBy.name} (${assignedBy.email})
            </p>
          </div>
          
          <div style="text-align: center; margin-bottom: 25px;">
            <a href="https://kan-ban-board-ai.vercel.app/dashboard/tasks" 
               style="display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 30px; font-weight: bold;">
              🚀 View Task Dashboard
            </a>
          </div>
          
          <div style="text-align: center; color: #888; font-size: 13px; border-top: 1px solid #eee; padding-top: 20px;">
            <p>© ${new Date().getFullYear()} Kanban Board. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Kanban Board" <${process.env.EMAIL_USER}>`,
      to: assignedUser.email,
      subject,
      text,
      html
    });

    logEmail('info', `Email sent to ${assignedUser.email}`, { 
      messageId: info.messageId,
      taskId: task._id,
      taskNumber: task.taskNumber 
    });

  } catch (error) {
    logEmail('error', 'Failed to send email', { 
      error: error.message,
      taskId: task._id,
      assignedUser: assignedUser?.email
    });
  }
};
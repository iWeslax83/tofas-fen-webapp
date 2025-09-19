// __mocks__/nodemailer.ts
import { vi } from 'vitest';

const nodemailer = {
  createTransport: vi.fn().mockReturnValue({
    sendMail: vi.fn().mockResolvedValue({
      messageId: 'mocked-message-id',
    }),
  }),
};
export default nodemailer;

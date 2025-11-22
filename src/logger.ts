import winston, { format, transports } from "winston";

const consoleTransport = new transports.Console({
  format: format.combine(
    format.errors({ stack: true }),
    format.timestamp({ format: "YYYY-MM-DD hh:mm:ss.SSS A" }),
    format.printf(
      ({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`,
    ),
  ),
});

const logger = winston.createLogger({
  defaultMeta: {
    service: "proint-api",
  },
  transports: [consoleTransport],
});

export { logger };

import winston from "winston";
import { config } from "../config.js";

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const isProduction = config.nodeEnv === "production";

const consoleFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const context = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `${ts} [${level}] ${message}${context}`;
});

export const logger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  defaultMeta: { service: "pulseboard-backend" },
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [
    new winston.transports.Console({
      format: isProduction
        ? combine(timestamp(), errors({ stack: true }), json())
        : combine(colorize(), timestamp(), errors({ stack: true }), consoleFormat)
    })
  ]
});

/**
 * Winston Logger Configuration
 * 
 * Provides structured logging for the application with different log levels
 * and formats for development and production environments.
 */

import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to Winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Define which transports to use based on environment
const transports = [
  // Console transport
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? format : consoleFormat,
  }),
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format,
  }),
  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log',
    format,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  // Handle uncaught exceptions and unhandled rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Helper functions for common logging patterns
export const logApiCall = (service: string, endpoint: string, duration?: number) => {
  logger.http(`API Call: ${service} ${endpoint}${duration ? ` (${duration}ms)` : ''}`);
};

export const logApiError = (service: string, endpoint: string, error: Error, duration?: number) => {
  logger.error(`API Error: ${service} ${endpoint}${duration ? ` (${duration}ms)` : ''}`, {
    error: error.message,
    stack: error.stack,
  });
};

export const logProlongedTask = (taskName: string, duration: number, threshold: number) => {
  if (duration > threshold) {
    logger.warn(`Prolonged Task: ${taskName} took ${duration}ms (threshold: ${threshold}ms)`);
  }
};

export const logPipelineStage = (stage: string, videoId: string, status: 'start' | 'complete' | 'error', duration?: number) => {
  const message = `Pipeline ${stage}: ${videoId} - ${status}${duration ? ` (${duration}ms)` : ''}`;
  if (status === 'error') {
    logger.error(message);
  } else {
    logger.info(message);
  }
};

export default logger;

import * as fs from 'fs';
import * as path from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  error?: string;
  stack?: string;
}

class Logger {
  private logDir = path.join(process.cwd(), 'logs');
  private isDevelopment = process.env.NODE_ENV !== 'production';

  constructor() {
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Write log entry to file and console
   */
  private log(level: LogLevel, message: string, context?: any, error?: Error): void {
    const timestamp = new Date().toISOString();
    
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      context,
      error: error?.message,
      stack: error?.stack
    };

    // Write to file
    const logFile = path.join(this.logDir, `${level}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      fs.appendFileSync(logFile, logLine, 'utf-8');
    } catch (err) {
      console.error('Failed to write log file:', err);
    }

    // Console output (development only, or for errors)
    if (this.isDevelopment || level === 'error' || level === 'warn') {
      const colorMap: Record<LogLevel, string> = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m',  // Green
        warn: '\x1b[33m',  // Yellow
        error: '\x1b[31m'  // Red
      };
      
      const reset = '\x1b[0m';
      const color = colorMap[level];
      
      const output = context 
        ? `${color}[${level.toUpperCase()}]${reset} ${message} ${JSON.stringify(context)}`
        : `${color}[${level.toUpperCase()}]${reset} ${message}`;
      
      console.log(output);
      
      if (error) {
        console.error(error);
      }
    }
  }

  debug(message: string, context?: any): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: any): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: any): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | string, context?: any): void {
    const err = typeof error === 'string' ? new Error(error) : error;
    this.log('error', message, context, err);
  }
}

export const logger = new Logger();
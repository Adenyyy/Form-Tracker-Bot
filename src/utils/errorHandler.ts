import { sendErrorMessage, sendWarningMessage } from "./logger.js";

export default function errorHandler() {

    process.on('uncaughtException', (error) => {
        sendErrorMessage(`[Uncaught Exception] ${error.message}`, error.stack);
    });

    process.on('unhandledRejection', (reason, p) => {
        p.catch((error) => {
            sendErrorMessage(`[Unhandled Rejection] ${reason}`, error.stack);
        });
    });

    process.on('warning', (warning) => {
        sendWarningMessage(`${warning.message}`, warning.stack);
    });

    process.on('exit', (code) => {
        sendErrorMessage(`Process exited with code ${code}`);
    });

    process.on('SIGINT', () => {
        sendErrorMessage('Process interrupted');
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        sendErrorMessage('Process terminated');
        process.exit(0);
    });




}
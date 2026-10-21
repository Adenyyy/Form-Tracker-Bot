import { MessageCommandType } from "../typings/MessageCommand.js";

export class MessageCommand {
    constructor(commandOptions: MessageCommandType) {
        Object.assign(this, commandOptions);
    }
}

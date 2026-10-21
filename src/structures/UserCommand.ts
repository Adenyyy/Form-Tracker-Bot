import { UserCommandType } from "../typings/UserCommand.js";

export class UserCommand {
    constructor(commandOptions: UserCommandType) {
        Object.assign(this, commandOptions);
    }
}

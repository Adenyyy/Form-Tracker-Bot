import { ButtonType } from "../typings/Button.js";

export class Button {
    constructor(commandOptions: ButtonType) {
        Object.assign(this, commandOptions);
    }
}

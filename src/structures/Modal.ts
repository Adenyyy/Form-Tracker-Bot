import { ModalSubmitType } from "../typings/Modal.js";

export class ModalSubmit {
    constructor(commandOptions: ModalSubmitType) {
        Object.assign(this, commandOptions);
    }
}

import { AnySelectMenuType } from "../typings/SelectMenu.js";

export class AnySelectMenu {
    constructor(commandOptions: AnySelectMenuType) {
        Object.assign(this, commandOptions);
    }
}
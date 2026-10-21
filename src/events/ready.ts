import { Event } from "../structures/Event.js";
import { client } from "../index.js";
import chalk from "chalk";
import { sendErrorMessage, sendInfoMessage } from "../utils/logger.js";
import { ActivityType, Events, PresenceStatusData } from "discord.js";

const activityTypes: Record<string, ActivityType> = {
    watching: ActivityType.Watching,
    playing: ActivityType.Playing,
    competing: ActivityType.Competing,
    listening: ActivityType.Listening,
};

export default new Event(Events.ClientReady, () => {
    sendInfoMessage(`Client logged in as: ${chalk.blueBright.underline(client.user.tag)}`);
    if (client.config.bot_activity.enabled === true) cycleActivities();
});

function cycleActivities() {
    const { activities, status = "online", type = "playing", interval = 30 } = client.config.bot_activity;

    if (!activities?.length) return sendErrorMessage(`No bot activities were provided in 'settings.yml' (bot_activity.activities)`);

    const activityType = activityTypes[type];
    if (activityType === undefined) return sendErrorMessage(`An invalid activity type was provided in 'settings.yml' (bot_activity.type)`);

    let activityIndex = 0;
    const setActivity = () => {
        client.user.setPresence({ activities: [{ name: activities[activityIndex], type: activityType }], status: status as PresenceStatusData });
        activityIndex = (activityIndex + 1) % activities.length;
    };

    setActivity();
    if (activities.length > 1) setInterval(setActivity, interval * 1000);
}

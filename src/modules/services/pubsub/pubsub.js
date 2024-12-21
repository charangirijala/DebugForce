// pubsub.js
const subscribers = {};

export const publish = (eventName, data) => {
    if (!subscribers[eventName]) {
        return;
    }

    subscribers[eventName].forEach((callback) => {
        callback(data);
    });
};

export const subscribe = (eventName, callback) => {
    if (!subscribers[eventName]) {
        subscribers[eventName] = [];
    }

    subscribers[eventName].push(callback);

    return {
        unsubscribe: () => {
            subscribers[eventName] = subscribers[eventName].filter(
                (cb) => cb !== callback
            );
        }
    };
};

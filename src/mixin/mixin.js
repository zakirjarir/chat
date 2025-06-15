export default {
    data() {
        return {
            lastMessage: {}
        };
    },
    methods: {
        async showNotification(title, options = {}) {
            if (!("Notification" in window)) {
                console.warn("❌ This browser does not support notifications.");
                return;
            }
            if (!document.hidden) {
                return;
            }

            const permission = await Notification.requestPermission();

            if (permission === "granted") {
                const notif = new Notification(title, options);

                notif.onclick = () => {
                    console.log("Notification clicked!");
                    if (options.data?.url) {
                        window.open(options.data.url, "_blank");
                    }
                };
            } else {
                console.warn("Notification permission not granted!");
            }
        }
    }
};

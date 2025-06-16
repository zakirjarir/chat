import {
    doc,
    setDoc,
    collection,
    addDoc,
    onSnapshot,
    deleteDoc, serverTimestamp, getDoc,getDocs
} from "firebase/firestore";
import { db } from "@/firebass/configration";
import {
    getAuth,
    signInAnonymously as fbSignInAnonymously,
} from "firebase/auth";

import $router from "@/router/index";
export default {
    data() {
        return {
            timer: null,
            callDuration: 0, // in seconds
            formattedDuration: "00:00",
            micOn: true,
            cameraOn: true,
            localStream: null,
            remoteStream: null,
            peerConnection: null,
            user: null,
            callDocId: this.$route.params.id,
            pendingCandidates: [],
            servers : {
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" }, // Public STUN
                    {
                        urls: "turn:relay.metered.ca:443",      // Public TURN (Free)
                        username: "openai",
                        credential: "openai"
                    }
                ]
            },

            lastMessage: {}
        };
    },
    methods: {
        async showNotification(title, options = {}) {
            if (!("Notification" in window)) {
                console.warn("❌ This browser does not support notifications.");
                return;
            }
            // if (!document.hidden) {
            //     return;
            // }

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
        },







        async signInAnonymously() {
            try {
                const auth = getAuth();
                await fbSignInAnonymously(auth);
            } catch (error) {
                $router.push("/");
                console.error("Anonymous login error:", error);
            }
        },

        startTimer() {
            this.callDuration = 0;
            this.updateFormattedDuration();
            this.timer = setInterval(() => {
                this.callDuration++;
                this.updateFormattedDuration();
            }, 1000);
        },

        stopTimer() {
            clearInterval(this.timer);
            this.timer = null;
        },

        updateFormattedDuration() {
            const minutes = String(Math.floor(this.callDuration / 60)).padStart(2, "0");
            const seconds = String(this.callDuration % 60).padStart(2, "0");
            this.formattedDuration = `${minutes}:${seconds}`;
        },

        toggleMic() {
            this.micOn = !this.micOn;
            if (this.localStream) {
                this.localStream.getAudioTracks().forEach((track) => {
                    track.enabled = this.micOn;
                });
            }
        },

        toggleCamera() {
            this.cameraOn = !this.cameraOn;
            if (this.localStream) {
                this.localStream.getVideoTracks().forEach((track) => {
                    track.enabled = this.cameraOn;
                });
            }
        },

        async startCall() {
            console.log(this.user.uid);
            const callDoc = doc(db, "calls", this.callDocId);

            const offerCandidates = collection(callDoc, "offerCandidates");
            const answerCandidates = collection(callDoc, "answerCandidates");

            // Get user media with quality and audio constraints
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 },
                    facingMode: "user"
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });

            this.remoteStream = new MediaStream();
            this.$refs.localVideo.srcObject = this.localStream;
            this.$refs.remoteVideo.srcObject = this.remoteStream;

            this.peerConnection = new RTCPeerConnection(this.servers);

            // Add local tracks to peer connection
            this.localStream.getTracks().forEach((track) => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            // Optional: Set bitrate limit for video (1.5 Mbps)
            this.peerConnection.getSenders().forEach((sender) => {
                if (sender.track.kind === "video") {
                    const parameters = sender.getParameters();
                    if (!parameters.encodings) parameters.encodings = [{}];
                    parameters.encodings[0].maxBitrate = 1500 * 1000; // 1.5 Mbps
                    sender.setParameters(parameters);
                }
            });

            this.peerConnection.ontrack = (event) => {
                event.streams[0].getTracks().forEach((track) => {
                    this.remoteStream.addTrack(track);
                });
            };

            this.peerConnection.onicecandidate = async (event) => {
                if (event.candidate) {
                    await addDoc(offerCandidates, event.candidate.toJSON());
                }
            };

            // Create and send offer
            const offerDescription = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offerDescription);
            await setDoc(callDoc, {
                offer: {
                    type: offerDescription.type,
                    sdp: offerDescription.sdp,
                    createdAt: serverTimestamp(),
                }
            });

            // Listen for answer
            onSnapshot(callDoc, (snapshot) => {
                const data = snapshot.data();
                if (
                    data?.answer &&
                    this.peerConnection &&
                    !this.peerConnection.currentRemoteDescription
                ) {
                    const answerDescription = new RTCSessionDescription(data.answer);
                    this.peerConnection
                        .setRemoteDescription(answerDescription)
                        .then(async () => {
                            for (const candidate of this.pendingCandidates) {
                                await this.peerConnection.addIceCandidate(candidate);
                            }
                            this.pendingCandidates = [];
                            this.startTimer();
                        })
                        .catch((e) => {
                            console.error("Error setting remote description:", e);
                        });
                }
            });

            // Listen for answer candidates
            onSnapshot(answerCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        const candidate = new RTCIceCandidate(change.doc.data());
                        if (
                            this.peerConnection &&
                            this.peerConnection.currentRemoteDescription
                        ) {
                            this.peerConnection.addIceCandidate(candidate).catch((e) => {
                                console.error("Error adding ICE candidate:", e);
                            });
                        } else {
                            this.pendingCandidates.push(candidate);
                        }
                    }
                });
            });
        },

        async joinCall() {
            const callDoc = doc(db, "calls", this.callDocId);
            const callData = (await getDoc(callDoc)).data();

            if (!callData) {
                console.error("Call document does not exist!");
                return;
            }

            const offerCandidates = collection(callDoc, "offerCandidates");
            const answerCandidates = collection(callDoc, "answerCandidates");

            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 },
                    facingMode: "user"
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });


            this.remoteStream = new MediaStream();
            this.$refs.localVideo.srcObject = this.localStream;
            this.$refs.remoteVideo.srcObject = this.remoteStream;

            this.peerConnection = new RTCPeerConnection(this.servers);

            this.localStream.getTracks().forEach((track) => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            this.peerConnection.getSenders().forEach(sender => {
                if (sender.track.kind === "video") {
                    const parameters = sender.getParameters();
                    if (!parameters.encodings) parameters.encodings = [{}];
                    parameters.encodings[0].maxBitrate = 1500 * 1000; // 1.5 Mbps
                    sender.setParameters(parameters);
                }
            });

            this.peerConnection.ontrack = (event) => {
                event.streams[0].getTracks().forEach((track) => {
                    this.remoteStream.addTrack(track);
                });
            };

            this.peerConnection.onicecandidate = async (event) => {
                if (event.candidate) {
                    await addDoc(answerCandidates, event.candidate.toJSON());
                }
            };

            try {
                await this.peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));
                const answerDescription = await this.peerConnection.createAnswer();
                await this.peerConnection.setLocalDescription(answerDescription);
                this.startTimer();

                await setDoc(
                    callDoc,
                    {
                        answer: {
                            type: answerDescription.type,
                            sdp: answerDescription.sdp,
                        },
                    },
                    { merge: true }
                );

                for (const candidate of this.pendingCandidates) {
                    await this.peerConnection.addIceCandidate(candidate);
                }
                this.pendingCandidates = [];
            } catch (e) {
                console.error("Error setting remote description:", e);
            }

            onSnapshot(offerCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        const candidate = new RTCIceCandidate(change.doc.data());
                        if (this.peerConnection && this.peerConnection.currentRemoteDescription) {
                            this.peerConnection.addIceCandidate(candidate).catch((e) => {
                                console.error("Error adding ICE candidate:", e);
                            });
                        } else {
                            this.pendingCandidates.push(candidate);
                        }
                    }
                });
            });
        },

        async deleteCollection(collectionName) {
            const colRef = collection(db, collectionName);
            const snapshot = await getDocs(colRef);

            console.log("Documents found:", snapshot.size); // এখানে দেখে নাও কতগুলো ডকুমেন্ট আছে

            if (snapshot.empty) {
                console.warn("⚠️ No documents found in collection:", collectionName);
                return;
            }

            const deletePromises = snapshot.docs.map(docSnap => {
                console.log("Deleting doc:", docSnap.id);
                return deleteDoc(doc(db, collectionName, docSnap.id));
            });

            await Promise.all(deletePromises);
            console.log("✅ Collection deleted successfully");
        },

        async endCall() {
            try {
                if (this.localStream) {
                    this.localStream.getTracks().forEach((track) => track.stop());
                    this.localStream = null;
                }

                if (this.peerConnection) {
                    this.peerConnection.close();
                    this.peerConnection = null;
                }

                if (this.$refs.remoteVideo) this.$refs.remoteVideo.srcObject = null;
                if (this.$refs.localVideo) this.$refs.localVideo.srcObject = null;

                await this.deleteCollection('calls'); // ✅ Await করা জরুরি
                this.stopTimer();

                this.$router.go(-1);
            } catch (error) {
                console.error("❌ Error ending call:", error);
            }
        }

    },
};

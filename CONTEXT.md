### **Project Summary: ChapGen - AI YouTube Chapter Generator**

**High-Level Goal:** The project, "ChapGen," is a cloud-native application designed to automatically generate semantic chapters for YouTube videos. It uses OpenAI's Whisper for audio transcription and Google's Gemini API for chapter generation. The entire backend is built on a distributed, event-driven microservices architecture orchestrated by Kubernetes, with a serverless, GPU-accelerated component for the heavy-lifting transcription task.

---

### **Final Architecture and Data Flow**

The system is composed of several decoupled microservices that communicate asynchronously via Kafka topics. The entire application is deployed on a Google Cloud VM running a K3s Kubernetes cluster.

**Core Components & Workflow:**

1.  **Frontend (React/Vite)**: A user-facing web application served via an Nginx container. It handles Google OAuth for user authentication and communicates with the backend via HTTP and WebSockets.
2.  **Entrypoint (Nginx Ingress)**: An Nginx Ingress controller acts as the single, secure entry point for all traffic. It terminates TLS using a Let's Encrypt certificate (managed by `cert-manager`) and routes requests based on URL paths to the appropriate backend services.
3.  **`ingestion-service`**: Receives a request from the frontend containing a YouTube URL. It uses `yt-dlp` to download the audio, splits it into fixed-duration chunks, and uploads each chunk to a Minio object storage bucket. For each uploaded chunk, it publishes a message containing the chunk's metadata (video ID, chunk ID, URL, etc.) to the `audio-chunks` Kafka topic.
4.  **`transcription-bridge` (Worker)**: This service is a dedicated Kafka consumer for the `audio-chunks` topic. Upon receiving a message, it triggers the serverless transcriber. It also exposes an HTTP endpoint (`/audio-chunks/{chunk_id}`) for the transcriber to download the audio files from Minio.
5.  **`transcriber-service` (Google Cloud Run Job)**: A serverless, GPU-accelerated container.
    * It is a **"scale-to-zero"** job, meaning it only runs (and incurs cost) when triggered.
    * It receives the chunk metadata from the `transcription-bridge` via environment variables.
    * It downloads the specified audio chunk from the bridge's HTTP endpoint.
    * It uses the **OpenAI Whisper** model on an attached NVIDIA L4 GPU to transcribe the audio.
    * It then sends the transcription results (a list of text segments with timestamps) back to the `transcription-bridge` via an HTTP POST request.
6.  **`transcription-bridge` (API)**: The same bridge service receives the POST request from the Cloud Run job and publishes the transcription results to the `transcription-results` Kafka topic.
7.  **`chapter-generation-service`**: Consumes completed transcriptions from the `transcription-results` topic. It assembles the full transcript, constructs a detailed prompt, and makes an API call to the **Google Gemini API** to generate the final list of chapters. It then publishes these chapters to the `chapter-results` topic.
8.  **`database-service`**: A FastAPI service providing a REST API to a **PostgreSQL** database, used for storing user and job information.
9.  **`frontend-bridge`**: Consumes the final chapters from the `chapter-results` topic and pushes them in real-time to the correct user's browser via a persistent **WebSocket** connection.
10. **Stateful Services**:
    * **PostgreSQL**: Stores user data and job status, with data persisted via a Kubernetes `PersistentVolumeClaim`.
    * **Minio**: S3-compatible object storage for audio chunks, also using a `PersistentVolumeClaim`.
    * **Kafka (Strimzi)**: The central message bus for all asynchronous communication.

---

### **Chronicle of Problems Tackled**

The journey from a local Minikube setup to a fully functional cloud deployment involved solving numerous real-world engineering challenges:

1.  **Containerization & Initial Networking**:
    * **Problem**: The React frontend was running on a local dev server.
    * **Solution**: Containerized the frontend using a multi-stage Dockerfile to build static assets and serve them with Nginx.
    * **Problem**: Google OAuth failed with a `redirect_uri_mismatch` error after containerization.
    * **Solution**: Updated the Google Cloud Console credentials to authorize the new `localhost:8080` origin used by the Docker container.

2.  **Production Networking & SSL (The Certificate Saga)**:
    * **Problem**: How to expose multiple services running in Kubernetes to the public internet securely.
    * **Solution**: Deployed an Nginx Ingress controller to act as a single entry point.
    * **Problem**: Accessing the domain resulted in a self-signed "fake certificate" error.
    * **Solution**: Initially attempted to use `mkcert` for a locally trusted certificate, which worked for the local machine but not for other devices (like a phone), as the root CA wasn't trusted there. This led to the decision to use a real, publicly trusted certificate.
    * **Problem**: The production-grade solution, `cert-manager`, failed its validation challenge. The logs revealed an error: `ingress contains invalid paths... cannot be used with pathType Exact`.
    * **Solution**: After several incorrect attempts (including patching the controller and adding annotations to the issuer), the definitive solution was found in the `cert-manager` release notes. An annotation, `acme.cert-manager.io/http01-ingress-path-type-override: "Prefix"`, was added to the Ingress resources themselves, resolving the conflict between `cert-manager` and the Nginx webhook.

3.  **Cloud Migration & `kubectl` Connectivity**:
    * **Problem**: The initial plan to use an AWS `t4g.large` instance was flawed.
    * **Solution**: Identified that the `t4g` instance uses an ARM-based processor, which was incompatible with the existing x86 Docker images. Pivoted to a compatible Google Cloud `e2-standard-2` VM.
    * **Problem**: Local `kubectl port-forward` commands failed to connect to the new Google Cloud cluster, showing errors like `no route to host` and `connection refused`.
    * **Solution**: Diagnosed that the local `kubeconfig` was still pointing to the old Minikube cluster. The fix involved copying the `kubeconfig` from the new server to the local machine.
    * **Problem**: This led to a new error: `tls: failed to verify certificate: x509...`.
    * **Solution**: Diagnosed that the K3s server's auto-generated certificate was only valid for internal IPs. The final fix was to re-run the K3s installation script with the `--tls-san` flag to include the server's public IP in the certificate's list of valid names.
    * **Problem**: This connection was then blocked by the Google Cloud firewall.
    * **Solution**: Created a new firewall rule to allow incoming traffic on the Kubernetes API port (`TCP:6443`).

4.  **Serverless GPU Worker (Cloud Run)**:
    * **Problem**: A dedicated, always-on GPU VM was prohibitively expensive (estimated >$200/month).
    * **Solution**: Pivoted to a serverless architecture using **Google Cloud Run Jobs** with a GPU attached, enabling a "scale-to-zero" model that is dramatically more cost-effective.
    * **Problem**: The deployment failed due to incorrect `gcloud` flags and resource minimums for GPU-enabled jobs.
    * **Solution**: Corrected the `gcloud run jobs deploy` command to use the `beta` track and allocated the required minimum of 4 vCPUs and 16Gi of memory.
    * **Problem**: The deployed job failed to start because Cloud Run Jobs are not long-running services and don't listen on a port.
    * **Solution**: Refactored the transcriber script to be a task-driven application that runs to completion and then exits, matching the Cloud Run Jobs execution model.

5.  **Final Application & Infrastructure Debugging**:
    * **Problem**: The `ingestion-service` was failing silently, and no messages were appearing in the Kafka `audio-chunks` topic.
    * **Solution**: Log analysis of the ingestion pod revealed a `NoSuchBucket` error. The fix was to manually create the `audio-chunks` bucket in the new Minio instance, which had been missed during the redeployment.
    * **Problem**: The `database-service` was in a `CrashLoopBackOff` state because it couldn't connect to PostgreSQL, which had not created the `chapterdb` database.
    * **Solution**: Diagnosed that the re-deployed PostgreSQL pod had attached to a stale, non-empty Persistent Volume from the previous installation and therefore skipped its initial database creation script. The fix was to delete the `PersistentVolumeClaim` to force PostgreSQL to start fresh.
    * **Problem**: The Cloud Run transcriber could not download audio chunks, failing with a `Connection reset by peer` error.
    * **Solution**: Diagnosed that the `transcription-bridge` was no longer a web server. The architecture was refactored to a final, hybrid model where the bridge is a FastAPI web server (to serve files) that also runs the Kafka consumer as a background task.

---

### **Notables for Recruiters**

* **Modern, Event-Driven Architecture**: The project demonstrates a strong understanding of modern software design, using a message bus (Kafka) to create a resilient, scalable, and decoupled microservices system.
* **Cost-Effective Serverless GPU Compute**: The decision to pivot from an expensive, always-on GPU VM to a "scale-to-zero" Google Cloud Run Job showcases an understanding of cloud cost optimization and modern serverless paradigms. This is a highly sought-after skill.
* **End-to-End Kubernetes Deployment**: The entire application, including stateful services like a database and object storage, is declaratively configured and deployed on Kubernetes. This demonstrates a deep, practical understanding of container orchestration.
* **Advanced Networking & Security**: The project correctly implements an Ingress controller for centralized traffic management and automates public SSL certificate provisioning with `cert-manager` and Let's Encrypt, demonstrating a commitment to security and best practices.
* **Extensive Troubleshooting**: The chronicle of problems solved proves a deep technical aptitude and the perseverance required to debug complex, real-world issues across the entire stack, from frontend configuration to cloud firewalls and Kubernetes internals.

---

### **Future Work: Implementing Refresh Token Authentication**

**Problem:** The current application uses the OAuth 2.0 Implicit Flow, where the frontend directly receives a short-lived `access_token`. This token can expire during long-running video processing jobs, causing the final step—updating the video description—to fail with an authentication error. This forces the user to log in again, which is a poor user experience.

**Solution:** The industry-standard solution is to implement the OAuth 2.0 Authorization Code Flow, which provides a long-lived `refresh_token` that can be used to automatically obtain new `access_token`s without user interaction.

**Implementation Plan:**

1.  **Modify Frontend Login:**
    *   Update the `useGoogleLogin` hook in `App.jsx` to use the Authorization Code Flow by setting `flow: 'auth-code'`.
    *   This will change the response from Google to provide a one-time `authorization_code` instead of an `access_token`.

2.  **Create a New Backend Authentication Service:**
    *   This could be a new microservice (e.g., `auth-service`) or a new set of endpoints within an existing service like the `frontend-bridge`.
    *   Create a new endpoint (e.g., `/api/auth/google/callback`) that accepts the `authorization_code` from the frontend.

3.  **Implement the Code-for-Token Exchange:**
    *   On the backend, this new endpoint will make a secure, server-to-server POST request to Google's token endpoint (`https://oauth2.googleapis.com/token`).
    *   The request must include the `authorization_code`, the `client_id`, the `client_secret`, and the `redirect_uri`.
    *   Google will validate the request and return an `access_token`, a `refresh_token`, and an `expires_in` value.

4.  **Securely Store Tokens:**
    *   The `refresh_token` is highly sensitive and must be stored securely in the **PostgreSQL database**, associated with the user's record.
    *   The `access_token` can also be stored in the database or in a secure, fast-access cache like Redis.

5.  **Implement Token Refresh Logic:**
    *   Modify the service responsible for making the final YouTube API call (currently the `frontend-bridge` handling the `updateVideoDescription` logic, but this could be moved to a dedicated `youtube-service`).
    *   Before making an API call, this service should check if the `access_token` is expired.
    *   If it is expired, the service must use the stored `refresh_token` to request a new `access_token` from Google.
    *   It should then update the stored `access_token` in the database and proceed with the original API call.

**Benefits of this Approach:**

*   **Seamless User Experience:** Users will not be forced to log in again, even if the video processing takes a long time.
*   **Enhanced Security:** The highly sensitive `refresh_token` is never exposed to the client-side browser, significantly reducing the risk of token theft.
*   **Industry Standard:** This is the recommended best practice for any application that requires long-term or offline access to a user's resources.
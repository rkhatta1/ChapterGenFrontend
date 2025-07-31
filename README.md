<div align="center">
<span style="margin-top: 10px; width: 4rem; margin-right: 0.5rem;"><img alt="Static Badge" src="https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=%23ffffff&logoSize=auto"></span>
<span style="margin-top: 10px; width: 4rem; margin-right: 0.5rem;"><img alt="Static Badge" src="https://img.shields.io/badge/Kubernetes-f3f3f3?style=flat&logo=kubernetes&logoSize=auto"></span>
<span style="margin-top: 10px; width: 4rem; margin-right: 0.5rem;"><img alt="Static Badge" src="https://img.shields.io/badge/Minio-61DAFB?style=flat&logo=minio&logoColor=%23000000&logoSize=auto"></span>
<span style="margin-top: 10px; width: 4rem; margin-right: 0.5rem;"><img alt="Static Badge" src="https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=%23ffffff&logoSize=auto"></span>
<span style="margin-top: 10px; width: 4rem; margin-right: 0.5rem;"><img alt="Static Badge" src="https://img.shields.io/badge/Kafka-20BEFF?style=flat&logo=apachekafka&logoColor=%23fffff&logoSize=auto"></span>
<!-- <span style="margin-top: 10px; width: 4rem; margin-right: 0.5rem;"><img alt="Static Badge" src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=%23ffffff&logoSize=auto"></span> -->
<span style="margin-top: 10px; width: 4rem; margin-right: 0.5rem;"><img alt="Static Badge" src="https://img.shields.io/badge/Gemini-8E75B2?style=flat&logo=googlegemini&logoColor=%23ffffff&logoSize=auto"></span>
<span style="margin-top: 10px; width: 4rem; margin-right: 0.5rem;"><img alt="Static Badge" src="https://img.shields.io/badge/HuggingFace-040404?style=flat&logo=huggingface&logoColor=%23FFD21E&logoSize=auto"></span>
</br>
<div style="font-size: 2.5rem; margin-bottom: 1rem;"><strong><h1>What's the Topic? - An AI YouTube chapter generator</h1></strong></div>
</div>

## Project Overview

Well, YouTube's creator studio already has a baked in feature for generating chapters, but it is quite lack luster when it comes to granularity and control over the semantics of the chapters that it generates. Hence, this project exists.

It is still under development. This is the repo for the project's frontend infrastructure.

## Local Development Setup

### Steps for local setup of the kubernetes/kafka backend server:

1. Make sure to set the backend up correctly. Check [this repository](https://github.com/rkhatta1/ChapterGen) for more info.

2. Create a new file **src/config.js**, and add the following in it:

    ```bash
    export const GOOGLE_CLIENT_ID = "<your-google-auth-client-id>"
    ```

2. Once you have the former configured and the local-transcriber flask app running, install all the dependencies and start the Vite server.

    ```bash
    npm install

    # &&

    npm run dev
    ```

### Testing the chapter generation:

- Open the local vite URL and login using your test account/s.
- Select your preferred YouTube channel.
- Play around with the configuration sliders.
- Generate the chapters with the click of a button.
---
title: License
description: License FAQ.
---

# License

While our client packages use the standard MIT license, [openapi-ts](https://github.com/ts-sdk-gen/openapi-ts/blob/main/LICENSE.md) uses the FSL license pioneered by Sentry. This page explains the motivation behind the change and attempts to answer the most commonly asked questions. If your question isn't answered here, please join the [discussion](https://github.com/orgs/hey-api/discussions/1141).

## FAQ

### Why does openapi-ts use the FSL license?

The main motivation behind using the FSL license for openapi-ts is to protect it from being sold by other companies. We have invested hundreds of hours into development, support, and maintenance to create a high quality product publicly available to everyone. It would not be fair for another company to come and monetize this work without giving back. The MIT license does not offer any protection if this ever happens.

### What's a permitted usage?

You are free to generate code with openapi-ts and use the generated code in commercial and non-commercial projects, as long as you do not charge your customers for the code generation. Prior to the license change from MIT on Sep 4th 2024, every use case fell under the permitted usage.

### What's NOT a permitted usage?

If you're using openapi-ts to sell competing services related to API tooling such as SDK generation, documentation generation, or API breaking change detection, these are excluded from permitted usage. Feel free to contact us if you're unsure about your use case!

### Which license does the generated code use?

The code generated by openapi-ts must follow the permitted usage outlined above. For example, it's fine to consume or publish the generated clients, but you cannot charge your customers for doing so.

## Feedback

We understand that your life would be easier if every package used the MIT license. At the same time, it's important to protect our work, so we can keep maintaining it without fear of being exploited by predatory companies. If you have any feedback about licensing, we would love to hear your thoughts in the [discussion](https://github.com/orgs/hey-api/discussions/1141).

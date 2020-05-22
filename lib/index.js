"use strict";

/**
 * Module dependencies
 */

/* eslint-disable no-unused-vars */
// Public node modules.
const AWS = require("aws-sdk");
const sharp = require("sharp");

module.exports = {
  init(config) {
    const S3 = new AWS.S3({
      apiVersion: "2006-03-01",
      ...config,
    });

    return {
      async upload(file, customParams = {}) {
        const webP = await sharp(file.buffer)
          .webp()
          .toBuffer()
          .then((data) => ({ buffer: data, mime: "image/webp", ext: ".webp" }));
        return new Promise((resolve, reject) => {
          // upload file on S3 bucket
          const path = file.path ? `${file.path}/` : "";
          S3.upload(
            {
              Key: `${path}${file.hash}${file.ext}`,
              Body: Buffer.from(file.buffer, "binary"),
              ACL: "public-read",
              ContentType: file.mime,
              ...customParams,
            },
            (err, data) => {
              if (err) {
                return reject(err);
              }
              const webpPromise = new Promise((res, rej) => {
                S3.upload(
                  {
                    Key: `${path}${file.hash}.webp`,
                    Body: Buffer.from(webP.buffer, "binary"),
                    ACL: "public-read",
                    ContentType: file.mime,
                    ...customParams,
                  },
                  (err, data) => {
                    if (err) {
                      return reject(err);
                    }

                    // set the bucket file url
                    file.url = data.Location;

                    res();
                  }
                );
              })
              webpPromise.then( _ => {
                file.url = data.Location;
                resolve();
              })
            }
          );
        });
      },
      delete(file, customParams = {}) {
        return new Promise((resolve, reject) => {
          // delete file on S3 bucket
          const path = file.path ? `${file.path}/` : "";
          S3.deleteObject(
            {
              Key: `${path}${file.hash}${file.ext}`,
              ...customParams,
            },
            (err, data) => {
              if (err) {
                return reject(err);
              }

              resolve();
            }
          );
          S3.deleteObject(
            {
              Key: `${path}${file.hash}.webp`,
              ...customParams,
            },
            (err, data) => {
              if (err) {
                return reject(err);
              }

              resolve();
            }
          );
        });
      },
    };
  },
};

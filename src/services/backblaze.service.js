const B2 = require('backblaze-b2');
const dotenv = require('dotenv');

dotenv.config();

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
  applicationKey: process.env.B2_APPLICATION_KEY,
});

let isAuthorized = false;
let downloadUrl = '';

const authorize = async () => {
  if (isAuthorized) return;
  try {
    const response = await b2.authorize();
    isAuthorized = true;
    downloadUrl = response.data.downloadUrl;
    console.log('Backblaze B2 Authorized');
  } catch (error) {
    console.error('B2 Authorization failed:', error.message);
    throw error;
  }
};

const uploadFile = async (fileBuffer, fileName, contentType) => {
  await authorize();
  try {
    const bucketResponse = await b2.getBucket({ bucketName: process.env.B2_BUCKET_NAME });
    const bucketId = bucketResponse.data.buckets[0].bucketId;

    const uploadUrlResponse = await b2.getUploadUrl({ bucketId });
    const { uploadUrl, authorizationToken } = uploadUrlResponse.data;

    const response = await b2.uploadFile({
      uploadUrl,
      uploadAuthToken: authorizationToken,
      fileName,
      data: fileBuffer,
      contentType,
    });

    // Return the S3-compatible URL
    return `https://${process.env.B2_BUCKET_NAME}.${process.env.B2_ENDPOINT}/${fileName}`;
  } catch (error) {
    console.error('B2 Upload failed:', error.message);
    throw error;
  }
};

const getSignedUrl = async (fileName) => {
  await authorize();
  try {
    const bucketResponse = await b2.getBucket({ bucketName: process.env.B2_BUCKET_NAME });
    const bucketId = bucketResponse.data.buckets[0].bucketId;

    const response = await b2.getDownloadAuthorization({
      bucketId,
      fileNamePrefix: fileName,
      validDurationInSeconds: 3600, // 1 hour
    });

    const token = response.data.authorizationToken;
    // Native B2 Friendly URL format for private files
    // Ensure the fileName path is properly encoded to handle spaces and special characters
    const encodedFileName = fileName.split('/').map(part => encodeURIComponent(part)).join('/');
    return `${downloadUrl}/file/${process.env.B2_BUCKET_NAME}/${encodedFileName}?Authorization=${token}`;
  } catch (error) {
    console.error('B2 Signed URL failed:', error.message);
    throw error;
  }
};

module.exports = {
  uploadFile,
  getSignedUrl,
};

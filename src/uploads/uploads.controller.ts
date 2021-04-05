import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as AWS from 'aws-sdk';

const BUCKET_NAME = 'kimchinubereatbeauponaskim221123';

@Controller('uploads')
export class UploadsController {
  @Post('')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file) {
    AWS.config.update({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
      },
      region: 'ap-northeast-2',
    });
    try {
      const objName = `${Date.now() + file.originalname}`;
      await new AWS.S3()
        .putObject({
          Bucket: BUCKET_NAME,
          Body: file.buffer,
          Key: objName,
          ACL: 'public-read',
        })
        .promise();
      const fileUrl = `https://${BUCKET_NAME}.s3.ap-northeast-2.amazonaws.com/${objName}`;
      return { url: fileUrl };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}

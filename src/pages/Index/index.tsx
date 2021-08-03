import { clipboard, NativeImage, nativeImage, remote } from 'electron';
import fs from 'fs-extra';
import React, { useRef, useState } from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import Axios from 'axios';
import { message } from 'antd';

import styles from './index.css';
import logo from '../../assets/icon.svg';
import Button from '../../components/Button';
import { logger } from '../../utils';

const Index = () => {
  const [scannedText, setScannedText] = useState('待识别');
  const [toBeGeneratedText, setToBeGeneratedText] = useState('');
  const [genedQrImage, setGenedQrImage] = useState<null | NativeImage>(null);
  const canvasRef = useRef(null);

  const handleClick = () => {
    const image = clipboard.readImage();
    const bitMap = image.getBitmap();
    if (!bitMap.length) {
      setScannedText('剪贴板中没有图片');
      return;
    }
    const { height, width } = image.getSize();
    const clampArray = Uint8ClampedArray.from(bitMap);
    const code = jsQR(clampArray, width, height);
    setScannedText(code?.data || '未识别到二维码');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    if (!text) {
      return;
    }
    setToBeGeneratedText(text);
  };

  const genCode = () => {
    QRCode.toCanvas(
      canvasRef.current as unknown as HTMLCanvasElement,
      toBeGeneratedText,
      {
        width: 360,
      }
    ).catch(logger.error);

    QRCode.toDataURL(toBeGeneratedText, { width: 360 })
      .then((dataUrl) => {
        const image = nativeImage.createFromDataURL(dataUrl);
        setGenedQrImage(image);
      })
      .catch(logger.error);
  };

  const handleSave = async () => {
    if (!genedQrImage) {
      return;
    }
    try {
      const { canceled, filePath } = await remote.dialog.showSaveDialog(
        remote.getCurrentWindow(),
        {
          defaultPath: 'qrcode.png',
        }
      );
      if (canceled || !filePath) {
        return;
      }
      await fs.writeFile(filePath, genedQrImage.toPNG());
      message.success('保存成功');
    } catch (err) {
      logger.error(err);
      message.error('保存失败');
    }
  };

  const handleCopyQrCode = () => {
    if (!genedQrImage) {
      return;
    }
    clipboard.writeImage(genedQrImage);
    message.success('已复制');
  };

  const handleClickDropArea = async () => {
    const result = await remote.dialog.showOpenDialog(
      remote.getCurrentWindow(),
      {
        properties: ['openFile'],
      }
    );
    if (result.canceled) {
      return;
    }
    try {
      const fileBuffer = await fs.readFile(result.filePaths[0]);
      const image = nativeImage.createFromBuffer(fileBuffer);
      const { width, height } = image.getSize();
      const parsed = jsQR(
        new Uint8ClampedArray(image.getBitmap()),
        width,
        height
      );
      setScannedText(parsed?.data || '未识别到二维码');
    } catch (err) {
      logger.error(err);
      setScannedText('识别出错');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const itemsAsList = Array.from(e.dataTransfer.items);
    e.dataTransfer.types.some(async (type, index) => {
      if (type === 'text/uri-list') {
        itemsAsList[index].getAsString(async (str) => {
          try {
            // base64
            if (str.startsWith('data:image')) {
              const image = nativeImage.createFromDataURL(str);
              const clampedArray = new Uint8ClampedArray(image.getBitmap());
              const { width, height } = image.getSize();
              const code = jsQR(clampedArray, width, height);
              setScannedText(code?.data || '未识别到二维码');
              return;
            }
            // Link
            const resp = await Axios.get(str, { responseType: 'arraybuffer' });
            const image = nativeImage.createFromBuffer(
              Buffer.from(resp.data, 'binary')
            );
            const clampedArray = new Uint8ClampedArray(image.getBitmap());
            const { width, height } = image.getSize();
            const code = jsQR(clampedArray, width, height);
            setScannedText(code?.data || '未识别到二维码');
          } catch (err) {
            logger.error(err);
            setScannedText('识别错误');
          }
        });
        return true;
      }
      if (type === 'Files') {
        const fileList = Array.from(e.dataTransfer.files);
        if (fileList[0].path) {
          const fileBuffer = await fs.readFile(fileList[0].path);
          const image = nativeImage.createFromBuffer(fileBuffer);
          const { width, height } = image.getSize();
          const parsed = jsQR(
            new Uint8ClampedArray(image.getBitmap()),
            width,
            height
          );
          setScannedText(parsed?.data || '未识别到二维码');
        }
      }
      return false;
    });
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className={styles.container}>
      <div className={styles.titleLine}>
        <img className={styles.titleLogo} src={logo} alt="logo" />
        <span className={styles.titleText}>二维码工具</span>
      </div>
      <div className={styles.contentWrapper}>
        <div className={styles.leftCard}>
          <div className={styles.cardTitle}>识别二维码</div>
          <div className={styles.leftContent}>
            <div className={styles.subTitle}>● 方式一</div>
            <div className={styles.imgPart}>
              <div className={styles.desc}>
                点击右侧图片上传区域上传二维码或者将二维码拖拽到该区域
              </div>
              <div
                aria-hidden="true"
                onClick={handleClickDropArea}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                className={styles.imgPartDrop}
              >
                拖入图片或点击上传
              </div>
            </div>
          </div>
          <div className={styles.subTitle}>● 方式二</div>
          <Button onClick={handleClick} text="点击按钮识别剪贴板中的图片" />

          <div className={styles.resultWrapper}>
            <span className={styles.resultTitle}>识别结果</span>
            <div className={styles.resultContent}>{scannedText}</div>
          </div>
        </div>
        <div className={styles.rightCard}>
          <div className={styles.cardTitle}>生成二维码</div>
          <div className={styles.desc}>请在下框中输入文字生成二维码</div>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              placeholder="请输入要生成二维码的内容"
              className={styles.genInput}
              onChange={handleInputChange}
              value={toBeGeneratedText}
            />
            <Button text="生成二维码" onClick={genCode} />
          </div>
          <div className={styles.resultTitle}>生成结果</div>
          <div className={styles.canvasWrapper}>
            {!genedQrImage ? (
              <div className={styles.defaultQrResult}>待生成二维码</div>
            ) : null}{' '}
            <canvas ref={canvasRef} />
            {genedQrImage ? (
              <div className={styles.buttonsWrapper}>
                <Button text="复制" onClick={handleCopyQrCode} />
                <Button text="保存" onClick={handleSave} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

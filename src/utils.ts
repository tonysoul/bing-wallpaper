import fs from "fs";
import path from "path";

export function checkAndCreateDir(fileName: string) {
  // 如果文件不存在，
  if (!fs.existsSync(fileName)) {
    // 并且文件夹也不存在，就创建文件夹先，文件夹路径
    const temp = fileName.slice(0, fileName.lastIndexOf(path.sep));

    if (!fs.existsSync(temp)) {
      fs.mkdirSync(temp, { recursive: true });
    }
  }
}

/**
 * 年月日20230509，格式化为(年-月)2023-05
 *
 * @param {string} iptStr 20230509
 * @return 2023-05
 */
export function dateFormat(iptStr: string) {
  const datestr = iptStr.slice(0, 6);
  const year = datestr.slice(0, 4);
  const month = datestr.slice(4);

  return `${year}-${month}`;
}

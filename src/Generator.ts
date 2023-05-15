import axios from "axios";
import fs from "fs";
import path from "path";
import { checkAndCreateDir, dateFormat } from "./utils";
import moment from "moment";

interface Wallpaper {
  host: string;
  thumbil: string;
  enddate: string;
  url: string;
  urlbase: string;
  copyright: string;
  copyrightlink: string;
  title: string;
  "4k": string;
}

// 数据库json的数据类型
interface DataStructrue {
  [key: string]: Wallpaper;
}

interface MonthData {
  date: string;
  thumbil: string;
  url: string;
  "4k": string;
  copyright: string;
  title: string;
}

export class MyGenerator {
  private baseApiUrl = `https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN&uhd=1`;
  // private baseApiUrl = `http://localhost:3001/wallpapers`;
  private baseBingUrl = "https://cn.bing.com";
  private databaseName = "wallpaper.json";

  constructor() {
    this.init();
  }

  private async init() {
    // 1.获取接口数据
    const dataArr = await this.fetchData();

    // 2.写入数据到json（总数据库）
    dataArr.forEach((item) => {
      this.writeToJson(item);
    });

    // 3.分别存入 按年月命名的文件夹内
    this.storeData();
  }

  // 1 获取数据
  private async fetchData() {
    const res = await axios.get(this.baseApiUrl);
    const wallpaperArr: Wallpaper[] = [];
    res.data.images.forEach((item: any) => {
      const { enddate, url, urlbase, copyright, copyrightlink, title } = item;

      const four_k = url
        .replace("&w=1920", "&w=3840")
        .replace("&h=1080", "&h=2160");

      const wallpaper: Wallpaper = {
        host: this.baseBingUrl,
        thumbil: urlbase + "_UHD.jpg&w=1000",
        enddate,
        url,
        urlbase,
        copyright,
        copyrightlink,
        title,
        "4k": four_k,
      };

      wallpaperArr.push(wallpaper);
    });

    return wallpaperArr;
  }

  // 2 写入所有数据到一个json
  private writeToJson(data: Wallpaper) {
    let fileContent: DataStructrue = {};
    const fileName = path.resolve(process.cwd(), this.databaseName);
    if (fs.existsSync(fileName)) {
      fileContent = JSON.parse(fs.readFileSync(fileName, "utf-8"));
    }
    fileContent[data.enddate] = data;
    fs.writeFileSync(fileName, JSON.stringify(fileContent));
  }

  // 3 把json数据，按照月份写入到相应文件
  private storeData() {
    try {
      const data = this.readWallpaper();
      const { dateKey, monthData } = this.groupByMonth(data);

      this.writeMonthData(dateKey, monthData);
    } catch (error) {}
  }

  private groupByMonth(data: DataStructrue) {
    // 获取当前月份
    const dateKey = moment().format("YYYYMM");
    const monthData: MonthData[] = [];

    Object.keys(data).forEach((item) => {
      if (item.startsWith(dateKey)) {
        const current = data[item];
        monthData.push({
          date: current.enddate,
          thumbil: current.host + current.thumbil,
          url: current.host + current.url,
          "4k": current.host + current["4k"],
          copyright: current.copyright,
          title: current.title,
        });
      }
    });

    monthData.sort((a, b) => {
      return Number(b.date) - Number(a.date);
    });
    // console.log(dateKey);
    // console.log(monthData);

    return {
      dateKey,
      monthData,
    };
  }

  private readWallpaper() {
    const obj: DataStructrue = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), this.databaseName), "utf-8")
    );

    return obj;
  }

  private writeMonthData(dateKey: string, data: MonthData[]) {
    // 获取文件名
    const tempName = dateFormat(dateKey);
    const dirName = path.resolve(process.cwd(), `picture/${tempName}`);
    const fileName = path.resolve(process.cwd(), dirName, "README.md");
    const firstItem = data[0];

    checkAndCreateDir(fileName);

    let fileContent = `## Bing Wallpaper (${tempName})
![](${firstItem.thumbil})Today: [${firstItem.copyright}](${firstItem.url})`;

    let tableHd = `
|      |      |      |
| :----: | :----: | :----: |
@table`;

    fileContent += tableHd;

    let tbody = "|";
    for (let i = 0; i < data.length; i++) {
      tbody += `![](${data[i].thumbil})${moment(data[i].date).format(
        "YYYY-MM-DD"
      )} [download 4k](${data[i]["4k"]})|`;

      if (i % 3 === 2 && i !== 0) {
        if (i !== data.length - 1) {
          tbody += "\n|";
        }
      }
    }

    fileContent = fileContent.replace("@table", tbody);
    // 写入当前月的wallpaper到指定月份文件夹内 picture
    fs.writeFileSync(fileName, fileContent);
    // 写入当前月的wallpaper到根目录README.md
    // TODO
    // 1. 在根目录下写入归档导航
    // ### 历史导航
    // [2023-05](/picture/2023-05/) | [2023-04](/picture/2023-04/)
    // 2. 根目录下返回最近30天的wallpaper
    fs.writeFileSync(path.resolve(process.cwd(), "README.md"), fileContent);
  }
}

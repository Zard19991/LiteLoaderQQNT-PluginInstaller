const { ipcMain, app, shell, BrowserWindow, dialog, net } = require("electron");
const StreamZip = require("node-stream-zip");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const progressStream = require("progress-stream");

async function install(webContent, plugin) {
  try {
    const pluginDataPath = LiteLoader.plugins.plugininstaller.path.data;
    const fileName = `${plugin.slug} v${plugin.version}.zip`;
    const cacheFilePath = path.join(pluginDataPath, fileName);

    const installPlugin = async () => {
      const { plugins } = LiteLoader.path;
      const plugin_path = `${plugins}/${plugin.slug}`;
      try {
        let tag = {
          text: "解压中...",
          progressData: null,
        };
        webContent.send("LiteLoader.plugininstaller.UpdateInfo", tag);
        fs.mkdirSync(plugin_path, { recursive: true });
        const zip = new StreamZip.async({ file: cacheFilePath });
        const entries = await zip.entries();
        const isFolder = !entries.hasOwnProperty("manifest.json");
        for (const entry of Object.values(entries)) {
          if (!entry.name.includes(".github")) {
            const pathname = `${plugin_path}/${
              isFolder ? entry.name.split("/").slice(1).join("/") : entry.name
            }`;
            if (entry.isDirectory) {
              fs.mkdirSync(pathname, { recursive: true });
              continue;
            }
            try {
              if (entry.isFile) {
                await zip.extract(entry.name, pathname);
                continue;
              }
            } catch (error) {
              fs.mkdirSync(pathname.slice(0, pathname.lastIndexOf("/")), {
                recursive: true,
              });
              await zip.extract(entry.name, pathname);
              continue;
            }
          }
        }
        await zip.close();
      } catch (error) {
        dialog.showErrorBox("PluginInstaller", error.stack || error.message);
        fs.rmSync(plugin_path, { recursive: true, force: true });
      }
      let tag = {
        text: "安装完成",
        progressData: null,
      };
      webContent.send("LiteLoader.plugininstaller.UpdateInfo", tag);
    };

    dowloadFile(webContent, plugin.PIurl, cacheFilePath, installPlugin);
  } catch (error) {
    dialog.showErrorBox("PluginInstaller", error.stack || error.message);
    return false;
  }
}

function dowloadFile(webContent, fileURL, fileSavePath, callback) {
  let tmpFileSavePath = fileSavePath + ".tmp";
  let cfgFileSavePath = fileSavePath + ".cfg.json";
  let downCfg = {
    rh: {}, //请求头
    percentage: 0, //进度
    transferred: 0, //已完成
    length: 0, //文件大小
    remaining: 0, //剩余
    first: true, //首次下载
  };
  let tmpFileStat = { size: 0 };

  if (fs.existsSync(tmpFileSavePath) && fs.existsSync(cfgFileSavePath)) {
    tmpFileStat = fs.statSync(tmpFileSavePath);
    downCfg = JSON.parse(fs.readFileSync(cfgFileSavePath, "utf-8").trim());
    downCfg.first = false;
    downCfg.transferred = tmpFileStat.size;
  }

  let writeStream = null;
  let fetchHeaders = {
    "Content-Type": "application/octet-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    Pragma: "no-cache",
  };

  if (downCfg.length != 0) {
    fetchHeaders.Range = "bytes=" + downCfg.transferred + "-" + downCfg.length;
  }
  if (downCfg.rh["last-modified"]) {
    fetchHeaders["last-modified"] = downCfg.rh["last-modified"];
  }

  const checkHerder = [
    "last-modified", //文件最后修改时间
    "server", //服务器
    "content-length", //文件大小
    "content-type", //返回类型
    "etag", //文件标识
  ];

  fetch(fileURL, {
    method: "GET",
    headers: fetchHeaders,
    //timeout: 1000,
  })
    .then((res) => {
      let h = {};
      res.headers.forEach(function (v, i, a) {
        h[i.toLowerCase()] = v;
      });
      let fileIsChange = false;
      if (downCfg.first) {
        for (let k of checkHerder) downCfg.rh[k] = h[k];
        downCfg.length = h["content-length"];
      } else {
        for (let k of checkHerder) {
          if (downCfg.rh[k] != h[k]) {
            fileIsChange = true;
            break;
          }
        }
        downCfg.range = res.headers.get("content-range") ? true : false;
      }
      writeStream = fs
        .createWriteStream(tmpFileSavePath, {
          flags: !downCfg.range || fileIsChange ? "w" : "a",
        })
        .on("error", function (e) {
          console.error("error==>", e);
        })
        .on("ready", function () {
          let tag = {
            text: "开始下载",
            progressData: null,
          };
          webContent.send("LiteLoader.plugininstaller.UpdateInfo", tag);
        })
        .on("finish", function () {
          fs.renameSync(tmpFileSavePath, fileSavePath);
          fs.unlinkSync(cfgFileSavePath);
          let tag = {
            text: "下载完成",
            progressData: null,
          };
          webContent.send("LiteLoader.plugininstaller.UpdateInfo", tag);
          callback();
        });
      fs.writeFileSync(cfgFileSavePath, JSON.stringify(downCfg));
      let fsize = h["content-length"];
      let str = progressStream({
        length: fsize,
        time: 200,
      });
      str.on("progress", function (progressData) {
        let tag = {
          text: "下载中...",
          progressData: progressData,
        };
        webContent.send("LiteLoader.plugininstaller.UpdateInfo", tag);
        /*
        {
            percentage: 9.05, 进度
            transferred: 949624, 已完成
            length: 10485760, 文件大小
            remaining: 9536136, 剩余
            eta: 42,
            runtime: 3, 耗时
            delta: 295396,
            speed: 949624 速度
        }
        */
      });
      res.body.pipe(str).pipe(writeStream);
    })
    .catch((error) => {
      dialog.showErrorBox("PluginInstaller", error.stack || error.message);
    });
}

module.exports = {
  install,
};

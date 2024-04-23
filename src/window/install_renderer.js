var dowload_tag = false
window.onload = async () => {
  try {
    const plugin = await plugininstaller.WindowInit();

    init(plugin);

    const dowloadTagProgess = document.querySelector("#dowloadTagProgess")
    const dowloadTagText = document.querySelector("#dowloadTagText")
    
    plugininstaller.onUpdateInfo((tag) => {
      dowloadTagText.textContent = tag.text;
      if(tag.progressData){
        dowloadTagProgess.value = tag.progressData.percentage;
      }
    })

    plugininstaller.WindowShow();
  } catch (error) {
    plugininstaller.log(1, error)
  }
}

function init(plugin) {
  const icon = plugin.icon ? `https://ghproxy.net/https://raw.githubusercontent.com/${plugin.repository.repo}/${plugin.repository.branch}/${plugin.icon}` : "default_icon.png"
  const temp = `
  <div>
      <div>
          <div class="icon"><img src="${icon}"></div>
          <div>
              <div>
                  <span class="name" title="${plugin.name}">${plugin.name}</span>
              </div>
              <div>
                  <span class="description" title="${plugin.description}">${plugin.description}</span>
              </div>
          </div>
      </div>
      <div class="info">
          <span>版本：${plugin.version}</span>
          <span>开发：${plugin.authors[0].name}</span>
      </div>
      <progress id="dowloadTagProgess"" max="100" value="0"></progress>
      <div class="button">
          <span id="dowloadTagText"></span>
          <button id="install" type="button">安装</button>
          <button id="more" type="button">详情</button>
          <button id="quit" type="button">关闭</button>
      </div>
  </div>
  `;
  const doc = new DOMParser().parseFromString(temp, "text/html");

  document.querySelector(".app").appendChild(doc.querySelector("div"));

  document.querySelector("#install").addEventListener("click", () => {
    if(!dowload_tag){
      dowload_tag = true;
      document.querySelector("#install").disabled = true;
      document.querySelector("#dowloadTagProgess").style.display = "block";
      document.querySelector("#dowloadTagText").style.display = "block";
      plugininstaller.installPlugin();
    }
  });

  document.querySelector("#more").addEventListener("click", () => {
    const link = "https://github.com/" + plugin.repository.repo;
    plugininstaller.openWeb(link);
  });

  document.querySelector("#quit").addEventListener("click", () => {
    plugininstaller.close();
  });
}
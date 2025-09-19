# IP 查询工具

这是 [https://ip.skk.moe/](https://ip.skk.moe/) 的复刻实现，提供 IP 地址查询、地理位置检测、DNS 出口分析、CDN 命中节点测试和网络连通性检查功能。所有数据通过浏览器前端获取，无需后端服务器。

## 主要功能

- **IP 地址查询**：支持多个国内外服务获取用户 IP 地址及地理位置信息，包括国家、省份、城市和 ISP。
- **网络连通性测试**：测试到各大网站的延迟（如百度、网易云音乐、GitHub 和 YouTube），并计算平均响应时间。
- **CDN 命中节点测试**：检测多个 CDN 提供商的命中节点，返回节点信息或位置。
- **DNS 出口查询**：分析 DNS 出口信息，包括服务商、运营商、IP 和位置，支持多服务聚合。

![项目界面截图](images/screenshot.png)

*图：项目主界面，展示 IP 查询、连通性测试和 CDN 结果。*

## 多主题

### 吉卜力

![吉卜力](images/screenshot-ghibli.png)

### 8bit

![8bit](images/screenshot-8bit.png)

## 使用方法

### 方式一: 访问网站

[https://ip.hydrz.cn](https://ip.hydrz.cn)


### 方式二: curl

用 curl 请求 https://ip.hydrz.cn 并读取响应头里自定义的客户端信息字段。

Example file: [examples/use-curl/main.sh](examples/use-curl/main.sh)
```bash
#!/bin/bash

response=$(curl -s -D - https://ip.hydrz.cn -o /dev/null)
client_ip=$(echo "$response" | grep -i '^x-client-ip:' | awk '{print $2}' | tr -d '\r')
client_asn=$(echo "$response" | grep -i '^x-client-asn:' | awk '{print $2}' | tr -d '\r')
client_geo=$(echo "$response" | grep -i '^x-client-geo:' | awk '{print $2}' | tr -d '\r')
edge_ip=$(echo "$response" | grep -i '^x-edge-ip:' | awk '{print $2}' | tr -d '\r')
cf_ray=$(echo "$response" | grep -i '^cf-ray:' | awk '{print $2}' | tr -d '\r')

# Split geo fields
continent=$(echo "$client_geo" | cut -d',' -f1)
country=$(echo "$client_geo" | cut -d',' -f2)
region=$(echo "$client_geo" | cut -d',' -f3)
city=$(echo "$client_geo" | cut -d',' -f4)
longitude=$(echo "$client_geo" | cut -d',' -f5)
latitude=$(echo "$client_geo" | cut -d',' -f6)
postal_code=$(echo "$client_geo" | cut -d',' -f7)
region_code=$(echo "$client_geo" | cut -d',' -f8)

echo "Client IP: $client_ip"
echo "Client ASN: $client_asn"
echo "Client Geo:"
echo "  Continent: $continent"
echo "  Country: $country"
echo "  Region: $region"
echo "  City: $city"
echo "  Longitude: $longitude"
echo "  Latitude: $latitude"
echo "  Postal Code: $postal_code"
echo "  Region Code: $region_code"
echo "CF IP: $edge_ip"
echo "CF Ray: $cf_ray"
```

### 方式三： 前端获取IP信息

Example file: [examples/use-html/index.html](examples/use-html/index.html)
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>IP 查询示例</title>
  </head>
  <body>
    <iframe src="https://ip.hydrz.cn/api" style="display: none"></iframe>
    <script type="module">
      // Post a message to the iframe to request IP info.
      const iframe = document.querySelector("iframe");
      iframe.onload = () => {
        iframe.contentWindow.postMessage("ip", "*");
      };

      // Listen for response from the iframe origin.
      window.addEventListener("message", (event) => {
        if (event.origin !== "https://ip.hydrz.cn") return;
        if (event.data && event.data.error) {
          document.body.innerText = event.data.error;
          return;
        }

        // Destructure returned payload.
        const { cfColo, cfIp, ip, asn, continent, country, region, region_code, city, lon, lat, postal_code } = event.data;
        document.body.innerText = `IP 信息:
IP 地址: ${ip}
ASN: ${asn}
数据中心: ${cfColo}
国家: ${country}
地区: ${region} (${region_code})
城市: ${city}
经度: ${lon}
纬度: ${lat}
邮政编码: ${postal_code}
`;
      });
    </script>
  </body>
</html>
```

## 开发规范

- **代码风格**：遵循 JavaScript 编码规范，使用 Biome 格式化工具。

## 贡献指南

欢迎提交 Issue 和 Pull Request！请确保：
- 遵循现有代码风格。
- 添加必要的测试和文档。
- 更新 README 以反映更改。

## 许可证

本项目采用 MIT 许可证。详情请见 [LICENSE](LICENSE) 文件。

## 致谢

感谢原项目 [https://ip.skk.moe/](https://ip.skk.moe/) 的作者提供灵感和基础实现。本复刻项目在此基础上进行了优化和扩展。
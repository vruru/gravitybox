# antigravity 中文

这是独立的 macOS 启动入口，不是重签名的 Antigravity 副本。始终打开
`/Applications/Antigravity.app`，沿用同一个官方进程、登录和资料目录。
切回原版界面：先用 ⌘Q 正常退出 Antigravity，再从官方图标打开。

官方版本号仅用于记录，不再作为允许汉化的条件。启动器仍校验 Google 官方
签名和应用标识；连接时复用 GravityBox 的回环监听归属检查和页面白名单，
只在匹配的官方界面隔离执行显示层词库。发现旧式改包痕迹时拒绝接入。
以后界面结构或词条变化，已有词条可继续匹配，未覆盖文案保留原文。
如果官方更改本机渲染连接方式，仍可能需要适配；这不是对任意未来界面的全量覆盖承诺。
不修改官方 App、聊天内容、代码或终端输出；不增加账号或远程服务。

本目录保存 Rust 启动器和 JS 渲染适配源码，不分发 Node、应用包或编译件。
构建以 `cargo build --release --locked --manifest-path chinese-launcher/Cargo.toml`
配合独立 `CARGO_TARGET_DIR`；应用包使用这里的 `Info.plist`、
`renderer.mjs` 和生成的 `antigravity-zh-launcher`，以及同版本
GravityBox 构建的 discovery 依赖（`dist/`）、本地化引擎、词库、语言资源和 Node 22。

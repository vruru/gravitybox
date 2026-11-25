use std::{
    env,
    ffi::c_void,
    fs::{self, OpenOptions},
    io,
    os::unix::fs::{OpenOptionsExt, PermissionsExt},
    path::Path,
    process::{Command, Stdio},
};

const APP: &str = "/Applications/Antigravity.app";
const EXECUTABLE: &str = "/Applications/Antigravity.app/Contents/MacOS/Antigravity";
const SIGNATURE_REQ: &str = "anchor apple generic and identifier \"com.google.antigravity\" and certificate leaf[subject.OU] = \"EQHXZ8M8AV\"";

#[link(name = "CoreFoundation", kind = "framework")]
unsafe extern "C" {
    fn CFStringCreateWithBytes(
        allocator: *const c_void,
        bytes: *const u8,
        length: isize,
        encoding: u32,
        external: u8,
    ) -> *const c_void;
    fn CFRelease(value: *const c_void);
    fn CFUserNotificationDisplayAlert(
        timeout: f64,
        flags: usize,
        icon: *const c_void,
        sound: *const c_void,
        localization: *const c_void,
        title: *const c_void,
        message: *const c_void,
        default: *const c_void,
        alternate: *const c_void,
        other: *const c_void,
        response: *mut usize,
    ) -> i32;
}

fn alert(message: &str) {
    let nil = std::ptr::null();
    let title = "antigravity 中文";
    unsafe {
        let head =
            CFStringCreateWithBytes(nil, title.as_ptr(), title.len() as isize, 0x08000100, 0);
        let body =
            CFStringCreateWithBytes(nil, message.as_ptr(), message.len() as isize, 0x08000100, 0);
        let label = "好";
        let ok = CFStringCreateWithBytes(nil, label.as_ptr(), label.len() as isize, 0x08000100, 0);
        let _ = CFUserNotificationDisplayAlert(
            0.0,
            1,
            nil,
            nil,
            nil,
            head,
            body,
            ok,
            nil,
            nil,
            std::ptr::null_mut(),
        );
        for value in [head, body, ok] {
            if !value.is_null() {
                CFRelease(value);
            }
        }
    }
}

fn official_running() -> io::Result<bool> {
    let output = Command::new("/bin/ps")
        .args(["-axww", "-o", "comm="])
        .output()?;
    if !output.status.success() {
        return Err(io::Error::other("无法识别官方 App 进程"));
    }
    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .any(|l| l.trim() == EXECUTABLE))
}

fn run() -> Result<(), String> {
    let e = |error: io::Error| error.to_string();
    let executable = env::current_exe().map_err(e)?;
    let contents = executable
        .parent()
        .and_then(Path::parent)
        .ok_or("启动器目录无效")?;
    let resources = contents.join("Resources");
    let home = env::home_dir().ok_or("无法识别用户目录")?;
    let state = home.join("Library/Logs/local.gravitybox.antigravity-zh-launcher");
    if !state.exists() {
        fs::create_dir(&state).map_err(e)?;
        fs::set_permissions(&state, fs::Permissions::from_mode(0o700)).map_err(e)?;
    }
    if fs::symlink_metadata(&state)
        .map_err(e)?
        .file_type()
        .is_symlink()
    {
        return Err("拒绝使用符号链接指向的日志目录".into());
    }
    let lock = OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .mode(0o600)
        .open(state.join("launcher.lock"))
        .map_err(e)?;
    if lock.try_lock().is_err() {
        let _ = Command::new("/usr/bin/open").args(["-a", APP]).status();
        return Ok(());
    }
    let valid = Command::new("/usr/bin/codesign")
        .args(["--verify", "--deep", "--strict"])
        .arg(format!("-R={SIGNATURE_REQ}"))
        .arg(APP)
        .output()
        .map_err(e)?;
    if !valid.status.success() {
        return Err("无法核验 Google 官方 App 的签名，已停止。".into());
    }
    let already = official_running().map_err(e)?;
    let mut open = Command::new("/usr/bin/open");
    open.args(["-a", APP]);
    if !already {
        open.args(["--args", "--remote-debugging-port=0"]);
    }
    if !open.status().map_err(e)?.success() {
        return Err("无法打开官方 Antigravity。".into());
    }
    let log = OpenOptions::new()
        .create(true)
        .truncate(true)
        .write(true)
        .mode(0o600)
        .open(state.join("launcher.log"))
        .map_err(e)?;
    let result = Command::new(resources.join("node"))
        .arg(resources.join("renderer.mjs"))
        .arg(if already {
            "already-running"
        } else {
            "launched"
        })
        .stdin(Stdio::null())
        .stdout(Stdio::from(log.try_clone().map_err(e)?))
        .stderr(Stdio::from(log))
        .status()
        .map_err(e)?;
    match result.code() {
        Some(0) => Ok(()),
        Some(12) => Err("官方 Antigravity 正在以普通模式运行。请先在官方 App 中按 ⌘Q 完全退出，再打开 antigravity 中文。你的登录和资料不受影响。".into()),
        Some(13) => Err("检测到官方 App 包有旧式汉化补丁，未启用动态汉化。请使用未修改的官方 App。".into()),
        _ => Err("没能接上 Antigravity 的本机界面。请确认官方 App 能打开，再重试启动器。".into()),
    }
}

fn main() {
    if let Err(message) = run() {
        alert(&message);
        std::process::exit(1);
    }
}

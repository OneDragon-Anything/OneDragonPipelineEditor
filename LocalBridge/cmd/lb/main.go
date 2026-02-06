package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/kqcoxn/MaaPipelineEditor/LocalBridge/internal/config"
	"github.com/kqcoxn/MaaPipelineEditor/LocalBridge/internal/eventbus"
	"github.com/kqcoxn/MaaPipelineEditor/LocalBridge/internal/logger"
	"github.com/kqcoxn/MaaPipelineEditor/LocalBridge/internal/paths"
	configProtocol "github.com/kqcoxn/MaaPipelineEditor/LocalBridge/internal/protocol/config"
	fileProtocol "github.com/kqcoxn/MaaPipelineEditor/LocalBridge/internal/protocol/file"
	resourceProtocol "github.com/kqcoxn/MaaPipelineEditor/LocalBridge/internal/protocol/resource"
	"github.com/kqcoxn/MaaPipelineEditor/LocalBridge/internal/router"
	"github.com/kqcoxn/MaaPipelineEditor/LocalBridge/internal/server"
	fileService "github.com/kqcoxn/MaaPipelineEditor/LocalBridge/internal/service/file"
	resourceService "github.com/kqcoxn/MaaPipelineEditor/LocalBridge/internal/service/resource"
	"github.com/kqcoxn/MaaPipelineEditor/LocalBridge/internal/utils"
	"github.com/kqcoxn/MaaPipelineEditor/LocalBridge/pkg/models"
	"github.com/spf13/cobra"
)

// 版本号（由构建时注入）
var Version = "dev"

// 命令行
var (
	configPath   string
	rootDir      string
	port         int
	logDir       string
	logLevel     string
	showVersion  bool
	portableMode bool
)

var rootCmd = &cobra.Command{
	Use:     "mpelb",
	Short:   "⭐ MPE Local Bridge - 为 MaaPipelineEditor 构建本地的桥梁 🌉",
	Long:    `MPE Local Bridge 是连接本地各系统与 MaaPipelineEditor 前端的桥梁服务，目前支持文件管理功能，更多集成即将更新！`,
	Version: Version,
	Run:     runServer,
}

var configCmd = &cobra.Command{
	Use:   "config",
	Short: "配置管理命令",
	Long:  `管理 LocalBridge 配置，包括打开配置文件、设置 MaaFramework 路径等`,
}

var configOpenCmd = &cobra.Command{
	Use:   "open",
	Short: "打开配置文件",
	Long:  `使用系统默认编辑器打开配置文件`,
	Run:   openConfig,
}

var openLogDirCmd = &cobra.Command{
	Use:   "open-log",
	Short: "打开后端日志文件夹",
	Long:  `使用系统文件管理器打开后端日志文件夹`,
	Run:   openLogDir,
	PreRun: func(cmd *cobra.Command, args []string) {
		paths.SetPortableMode(portableMode)
		paths.Init()
	},
}

var infoCmd = &cobra.Command{
	Use:   "info",
	Short: "显示路径信息",
	Long:  `显示当前的运行模式和各路径配置信息`,
	Run:   showInfo,
	PreRun: func(cmd *cobra.Command, args []string) {
		paths.SetPortableMode(portableMode)
		paths.Init()
	},
}

func init() {
	rootCmd.Flags().StringVar(&configPath, "config", "", "配置文件路径")
	rootCmd.Flags().StringVar(&rootDir, "root", "", "文件扫描根目录")
	rootCmd.Flags().IntVar(&port, "port", 0, "WebSocket 监听端口")
	rootCmd.Flags().StringVar(&logDir, "log-dir", "", "日志输出目录")
	rootCmd.Flags().StringVar(&logLevel, "log-level", "", "日志级别 (DEBUG, INFO, WARN, ERROR)")
	rootCmd.Flags().BoolVarP(&showVersion, "version", "v", false, "显示版本号")
	rootCmd.Flags().BoolVar(&portableMode, "portable", false, "便携模式：使用可执行文件同目录存储配置")

	// 添加子命令
	rootCmd.AddCommand(configCmd)
	rootCmd.AddCommand(infoCmd)

	// info 子命令
	infoCmd.Flags().BoolVar(&portableMode, "portable", false, "便携模式")

	// config 子命令
	configCmd.AddCommand(configOpenCmd)
	configCmd.AddCommand(openLogDirCmd)

	configCmd.Flags().StringVar(&configPath, "config", "", "配置文件路径")
	configCmd.PersistentFlags().BoolVar(&portableMode, "portable", false, "便携模式")
}

// 主函数
func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "错误: %v\n", err)
		os.Exit(1)
	}
}

// 打印启动 Banner
func printBanner() {
	fmt.Println()
	fmt.Println("\033[36m   __  __ ____  _____ _     ____ ")
	fmt.Println("  |  \\/  |  _ \\| ____| |   | __ ) ")
	fmt.Println("  | |\\/| | |_) |  _| | |   |  _ \\ ")
	fmt.Println("  | |  | |  __/| |___| |___| |_) |")
	fmt.Println("  |_|  |_|_|   |_____|_____|____/ ")
	fmt.Println("\033[0m")
	fmt.Printf("  \033[90mMaaPipelineEditor Local Bridge v%s\033[0m\n", Version)
	fmt.Println("  \033[90m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m")
	fmt.Println()
}

// 启动服务
func runServer(cmd *cobra.Command, args []string) {
	// 打印启动 Banner
	printBanner()

	// 设置便携模式
	paths.SetPortableMode(portableMode)

	// 初始化路径系统
	paths.Init()

	// 确保所有必要目录存在
	if err := paths.EnsureAllDirs(); err != nil {
		fmt.Fprintf(os.Stderr, "创建数据目录失败: %v\n", err)
		os.Exit(1)
	}

	// 加载配置
	cfg, err := config.Load(configPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "加载配置失败: %v\n", err)
		os.Exit(1)
	}

	// 从命令行参数覆盖配置
	cfg.OverrideFromFlags(rootDir, logDir, logLevel, port)

	// 初始化日志系统
	if err := logger.Init(cfg.Log.Level, cfg.Log.Dir, cfg.Log.PushToClient); err != nil {
		fmt.Fprintf(os.Stderr, "初始化日志系统失败: %v\n", err)
		os.Exit(1)
	}

	logger.Info("Main", "Local Bridge 启动中... 版本: %s", Version)
	logger.Debug("Main", "运行模式: %s", paths.GetModeName())
	logger.Debug("Main", "数据目录: %s", paths.GetDataDir())
	logger.Info("Main", "运行目录: %s", cfg.File.Root)
	logger.Debug("Main", "监听端口: %d", cfg.Server.Port)

	// 创建事件总线
	eventBus := eventbus.GetGlobalBus()

	// 创建文件服务
	fileSvc, err := fileService.NewService(
		cfg.File.Root,
		cfg.File.Exclude,
		cfg.File.Extensions,
		eventBus,
	)
	if err != nil {
		logger.Error("Main", "创建文件服务失败: %v", err)
		os.Exit(1)
	}

	// 启动文件服务
	if err := fileSvc.Start(); err != nil {
		logger.Error("Main", "启动文件服务失败: %v", err)
		os.Exit(1)
	}

	// 创建资源扫描服务
	resSvc := resourceService.NewService(cfg.File.Root, eventBus)
	if err := resSvc.Start(); err != nil {
		logger.Warn("Main", "资源扫描服务启动失败: %v", err)
	} else {
		logger.Debug("Main", "资源扫描服务已启动")
	}

	// 检查更新
	checkAndPrintUpdateNotice()

	// 创建 WebSocket 服务器
	wsServer := server.NewWebSocketServer(cfg.Server.Host, cfg.Server.Port, eventBus)

	// 设置日志推送函数
	logger.SetPushFunc(func(level, module, message string) {
		wsServer.Broadcast(models.Message{
			Path: "/lte/logger",
			Data: models.LogData{
				Level:     level,
				Module:    module,
				Message:   message,
				Timestamp: time.Now().Format(time.RFC3339),
			},
		})
	})

	// 订阅连接建立事件，推送历史日志
	eventBus.Subscribe(eventbus.EventConnectionEstablished, func(event eventbus.Event) {
		conn, ok := event.Data.(*server.Connection)
		if !ok {
			return
		}
		// 获取历史日志并推送
		historyLogs := logger.GetHistoryLogs()
		for _, log := range historyLogs {
			conn.Send(models.Message{
				Path: "/lte/logger",
				Data: models.LogData{
					Level:     log.Level,
					Module:    log.Module,
					Message:   log.Message,
					Timestamp: log.Timestamp.Format(time.RFC3339),
				},
			})
		}
	})

	// 订阅配置重载事件
	eventBus.Subscribe(eventbus.EventConfigReload, func(event eventbus.Event) {
		cfg, ok := event.Data.(*config.Config)
		if !ok {
			logger.Error("Main", "配置重载事件数据类型错误")
			return
		}

		logger.Info("Main", "收到配置重载事件，开始重载各服务...")

		// 重载资源扫描服务
		if resSvc != nil {
			if err := resSvc.Reload(cfg.File.Root); err != nil {
				logger.Error("Main", "资源扫描服务重载失败: %v", err)
			} else {
				logger.Info("Main", "资源扫描服务重载完成")
			}
		}

		logger.Info("Main", "所有服务重载完成")
	})

	// 创建路由分发器
	rt := router.New()

	// 注册协议处理器
	fileHandler := fileProtocol.NewHandler(fileSvc, eventBus, wsServer, cfg.File.Root)
	rt.RegisterHandler(fileHandler)

	// 注册 Config 协议处理器
	configHandler := configProtocol.NewConfigHandler()
	rt.RegisterHandler(configHandler)

	// 注册 Resource 协议处理器
	resourceHandler := resourceProtocol.NewHandler(resSvc, eventBus, wsServer, cfg.File.Root)
	rt.RegisterHandler(resourceHandler)

	// 设置消息处理器
	wsServer.SetMessageHandler(rt.Route)

	// 启动 WebSocket 服务器
	go func() {
		if err := wsServer.Start(); err != nil {
			logger.Error("Main", "WebSocket 服务器错误: %v", err)
		}
	}()

	// 等待退出信号
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, getExitSignals()...)

	<-sigChan

	// 退出
	logger.Info("Main", "正在关闭 Local Bridge 服务...")

	wsServer.Stop()
	fileSvc.Stop()

	logger.Info("Main", "Local Bridge 已退出")
}

// 打开配置文件
func openConfig(cmd *cobra.Command, args []string) {
	// 初始化路径系统
	paths.Init()

	// 确定配置文件路径
	var cfgPath string
	if configPath != "" {
		cfgPath = configPath
	} else {
		// 使用 paths 包获取配置文件路径
		cfgPath = paths.GetConfigFile()
	}

	// 转换为绝对路径
	absPath, err := filepath.Abs(cfgPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "错误: 无法获取配置文件的绝对路径: %v\n", err)
		os.Exit(1)
	}

	// 检查文件是否存在
	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "错误: 配置文件不存在: %s\n", absPath)
		os.Exit(1)
	}

	fmt.Printf("正在打开配置文件: %s\n", absPath)

	// 根据不同操作系统使用不同的命令打开文件
	var command *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		command = exec.Command("cmd", "/c", "start", "", absPath)
	case "darwin":
		command = exec.Command("open", absPath)
	case "linux":
		command = exec.Command("xdg-open", absPath)
	default:
		fmt.Fprintf(os.Stderr, "错误: 不支持的操作系统: %s\n", runtime.GOOS)
		os.Exit(1)
	}

	// 执行命令
	if err := command.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "错误: 打开配置文件失败: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("✅ 配置文件已在默认编辑器中打开")
}

// 设置 MaaFramework lib 路径
// 交互式提示输入路径
func promptForPath(title, hint, currentValue string) string {
	fmt.Println()
	fmt.Printf("┌─ %s\n", title)
	fmt.Printf("│  %s\n", strings.ReplaceAll(hint, "\n", "\n│  "))
	if currentValue != "" {
		fmt.Printf("│  当前值: %s\n", currentValue)
	}
	fmt.Print("└─ 请输入路径 (留空保持不变): ")

	reader := bufio.NewReader(os.Stdin)
	input, _ := reader.ReadString('\n')
	input = strings.TrimSpace(input)

	if input == "" {
		return currentValue
	}
	return input
}

// 打开后端日志文件夹
func openLogDir(cmd *cobra.Command, args []string) {
	// 加载配置
	cfg, err := config.Load(configPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "加载配置失败: %v\n", err)
		os.Exit(1)
	}

	// 获取后端日志目录
	var logDir string
	if cfg != nil && cfg.Log.Dir != "" {
		logDir = cfg.Log.Dir
	} else {
		// 使用默认日志目录
		logDir = paths.GetLogDir()
	}

	// 转换为绝对路径
	absPath, err := filepath.Abs(logDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "错误: 无法获取日志目录的绝对路径: %v\n", err)
		os.Exit(1)
	}

	// 检查目录是否存在
	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "错误: 日志目录不存在: %s\n", absPath)
		os.Exit(1)
	}

	fmt.Printf("正在打开日志文件夹: %s\n", absPath)

	// 根据不同操作系统使用不同的命令打开目录
	var command *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		command = exec.Command("explorer", absPath)
	case "darwin":
		command = exec.Command("open", absPath)
	case "linux":
		command = exec.Command("xdg-open", absPath)
	default:
		fmt.Fprintf(os.Stderr, "错误: 不支持的操作系统: %s\n", runtime.GOOS)
		os.Exit(1)
	}

	// 执行命令
	if err := command.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "错误: 打开日志文件夹失败: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("✅ 日志文件夹已在文件管理器中打开")
}

// GitHub Release 响应结构
type GitHubRelease struct {
	TagName string `json:"tag_name"`
	HTMLURL string `json:"html_url"`
}

// 检查并显示更新提醒
func checkAndPrintUpdateNotice() {
	// 跳过开发版本的检查
	if Version == "dev" {
		logger.Debug("Update", "当前为开发版本，跳过更新检查")
		return
	}

	// 获取最新版本信息
	latestVersion, releaseURL, err := getLatestVersion()
	if err != nil {
		logger.Debug("Update", "检查更新失败: %v", err)
		return
	}

	// 比较版本号
	currentVersion := strings.TrimPrefix(Version, "v")
	latestVersion = strings.TrimPrefix(latestVersion, "v")

	// 使用语义化版本比较
	if compareVersion(latestVersion, currentVersion) > 0 {
		fmt.Println()
		fmt.Println("══════════════════════════════════════════════════")
		fmt.Println("🎉 发现新版本")
		fmt.Println("══════════════════════════════════════════════════")
		fmt.Printf("   当前版本: v%s\n", currentVersion)
		fmt.Printf("   最新版本: v%s\n", latestVersion)
		fmt.Println()
		fmt.Println("   下载地址:")
		fmt.Printf("   %s\n", releaseURL)
		fmt.Println("   快速更新指令:")
		utils.PrintInstallCommand()
		fmt.Println("══════════════════════════════════════════════════")
		fmt.Println()
	} else {
		logger.Debug("Update", "当前版本 v%s 已是最新版本 (最新: v%s)", currentVersion, latestVersion)
	}
}

// 获取最新版本信息
func getLatestVersion() (string, string, error) {
	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	resp, err := client.Get("https://api.github.com/repos/kqcoxn/MaaPipelineEditor/releases/latest")
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("GitHub API 返回状态码: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", err
	}

	var release GitHubRelease
	if err := json.Unmarshal(body, &release); err != nil {
		return "", "", err
	}

	return release.TagName, release.HTMLURL, nil
}

// 显示路径信息
func showInfo(cmd *cobra.Command, args []string) {
	fmt.Println()
	fmt.Println("══════════════════════════════════════════════════")
	fmt.Println("📁 MPE Local Bridge 路径信息")
	fmt.Println("══════════════════════════════════════════════════")
	fmt.Println()
	fmt.Printf("🎯 运行模式:     %s\n", paths.GetModeName())
	fmt.Println()
	fmt.Println("📂 目录路径:")
	fmt.Printf("   数据目录:     %s\n", paths.GetDataDir())
	fmt.Printf("   配置文件:     %s\n", paths.GetConfigFile())
	fmt.Printf("   日志目录:     %s\n", paths.GetLogDir())
	fmt.Printf("   可执行文件:   %s\n", paths.GetExeDir())
	fmt.Println()
	fmt.Println("──────────────────────────────────────────────────")
	fmt.Println("💡 提示:")
	fmt.Println("   - 使用 --portable 参数可切换到便携模式")
	fmt.Println("   - 开发模式: 可执行文件旁存在 config/ 目录时自动启用")
	fmt.Println("   - 本地模式: 使用系统用户数据目录")
	fmt.Println("══════════════════════════════════════════════════")
	fmt.Println()
}

// compareVersion 比较两个语义化版本号
// 返回值: 1 表示 v1 > v2, -1 表示 v1 < v2, 0 表示 v1 == v2
func compareVersion(v1, v2 string) int {
	// 移除可能的 v 前缀
	v1 = strings.TrimPrefix(v1, "v")
	v2 = strings.TrimPrefix(v2, "v")

	// 分割版本号
	parts1 := strings.Split(v1, ".")
	parts2 := strings.Split(v2, ".")

	// 补齐到相同长度
	maxLen := len(parts1)
	if len(parts2) > maxLen {
		maxLen = len(parts2)
	}

	for len(parts1) < maxLen {
		parts1 = append(parts1, "0")
	}
	for len(parts2) < maxLen {
		parts2 = append(parts2, "0")
	}

	// 逐段比较
	for i := 0; i < maxLen; i++ {
		// 提取数字部分（忽略预发布标识）
		num1 := extractNumber(parts1[i])
		num2 := extractNumber(parts2[i])

		if num1 > num2 {
			return 1
		}
		if num1 < num2 {
			return -1
		}
	}

	return 0
}

// extractNumber 从版本号段中提取数字部分
func extractNumber(s string) int {
	// 移除非数字字符（如 -alpha, -beta 等）
	var numStr string
	for _, c := range s {
		if c >= '0' && c <= '9' {
			numStr += string(c)
		} else {
			break
		}
	}

	if numStr == "" {
		return 0
	}

	num := 0
	fmt.Sscanf(numStr, "%d", &num)
	return num
}

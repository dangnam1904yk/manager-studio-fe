import React from 'react';
import type { FormProps } from 'antd';
import { Button, Form, Input } from 'antd';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import ImageGallery from './ImageGallery';

type FieldType = {
    url?: string;
};

const FormUpload: React.FC = () => {
    // 1. Gọi Hook ở ĐÂY (Cấp cao nhất bên trong component)
    // const apiGetImg = useGetImg(); // Không dùng hook này nữa vì chuyển sang SSE
    const [dataImg, setDataImg] = React.useState<any[]>([]);
    const [isStreaming, setIsStreaming] = React.useState(false);
    const [nextPageToken, setNextPageToken] = React.useState<string | null>(null);
    const [folderUrl, setFolderUrl] = React.useState<string>("");

    // Sử dụng ref để lưu trữ các giá trị state mới nhất. 
    // Điều này giúp hàm scroll không bị stale closure và không cần add/remove listener liên tục.
    const stateRef = React.useRef({
        isStreaming,
        nextPageToken,
        folderUrl
    });

    // Đồng bộ state vào ref mỗi khi state thay đổi
    React.useEffect(() => {
        stateRef.current = { isStreaming, nextPageToken, folderUrl };
    }, [isStreaming, nextPageToken, folderUrl]);

    const loadMoreImages = React.useCallback((targetUrl: string, token: string | null) => {
        // Sử dụng giá trị từ ref để đảm bảo luôn lấy được trạng thái mới nhất ngay cả khi hàm không bị tái tạo
        if (stateRef.current.isStreaming || !targetUrl) return;
        setIsStreaming(true);

        const ctrl = new AbortController();

        fetchEventSource(`${import.meta.env.VITE_API_URL}/api/stream-images`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: targetUrl, pageToken: token }),
            signal: ctrl.signal,
            async onopen(response) {
                if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream')) {
                    throw new Error("Lỗi kết nối Stream");
                }
            },
            onmessage(event) {
                if (event.event === "next-page") {
                    console.log("👉 Đã nhận được next-page token từ BE:", event.data);
                    setNextPageToken(event.data);
                    setIsStreaming(false);
                    ctrl.abort(); // Đóng kết nối để chờ lần cuộn tới
                } else if (event.event === "image-record" || event.data) {
                    try {
                        const newImg = JSON.parse(event.data);
                        setDataImg(prev => [...prev, newImg]);
                    } catch (e) {
                        console.error("Parse JSON stream bị lỗi:", e);
                    }
                }
            },
            onclose() {
                setIsStreaming(false);
            },
            onerror(err) {
                if (err && err.name === 'AbortError') {
                    console.log("Kết nối stream đã được đóng chủ động.");
                    return;
                }
                console.error("Stream lỗi:", err);
                setIsStreaming(false);
                throw err;
            }
        });
    }, []); // Dependency array trống giúp hàm này giữ nguyên tham chiếu

    const onFinish: FormProps<FieldType>['onFinish'] = (values) => {
        const url = values.url || "";
        setDataImg([]);
        setNextPageToken(null);
        setFolderUrl(url);

        // Gán trực tiếp vào ref để xử lý ngay lập tức (vượt qua tính bất đồng bộ của setState)
        stateRef.current.folderUrl = url;
        stateRef.current.nextPageToken = null;

        loadMoreImages(url, null);
    };

    // Hàm tải thêm dữ liệu được gọi bởi Virtuoso khi cuộn đến cuối danh sách
    const handleLoadMore = React.useCallback(() => {
        const { isStreaming: currentIsStreaming, nextPageToken: currentToken, folderUrl: currentUrl } = stateRef.current;
        if (currentToken && !currentIsStreaming) {
            console.log("👉 Virtuoso kích hoạt tải trang tiếp theo với token:", currentToken);
            loadMoreImages(currentUrl, currentToken);
        }
    }, [loadMoreImages]);

    const onFinishFailed: FormProps<FieldType>['onFinishFailed'] = (errorInfo) => {
        console.log('Failed:', errorInfo);
    };



    return (
        <>
            <Form
                name="basic"
                labelCol={{ span: 8 }}
                wrapperCol={{ span: 16 }}
                style={{ maxWidth: 600 }}
                initialValues={{ remember: true }}
                onFinish={onFinish}
                onFinishFailed={onFinishFailed}
                autoComplete="off"
            >
                <Form.Item<FieldType>
                    label="Link url driver"
                    name="url"
                    initialValue="https://drive.google.com/drive/folders/1chZtJxIzYZGFV8sWCHXEAjoPniHWhIDZ"
                    rules={[{ required: true, message: 'Please input your url!' }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item label={null}>
                    <Button type="primary" htmlType="submit" loading={isStreaming}>
                        Submit
                    </Button>
                </Form.Item>
            </Form >
            <ImageGallery images={dataImg} folderId="" loading={isStreaming && dataImg.length === 0} onLoadMore={handleLoadMore} />
        </>
    );
};

export default FormUpload;
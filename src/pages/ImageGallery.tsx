import React, { useState, useCallback } from 'react';
import { Card, Typography, Empty, Image, Spin, Checkbox, Input, Button, message } from 'antd';
import { useChooseImg } from '../query';
import { VirtuosoGrid } from 'react-virtuoso';

const { Title, Text } = Typography;

interface ImageGalleryProps {
    images: any[];
    folderId?: string;
    loading?: boolean;
    onLoadMore?: () => void;
}

// Custom wrapper để hiển thị Spin khi tải ảnh gốc trong Preview Modal
const CustomImagePreview = ({ node, onSrcChange }: { node: React.ReactElement<any>, onSrcChange?: (src: string) => void }) => {
    const [imgLoading, setImgLoading] = React.useState(true);
    const [showSpinner, setShowSpinner] = React.useState(false);

    React.useEffect(() => {
        let isCancelled = false;

        if (node.props.src) {
            if (onSrcChange) onSrcChange(node.props.src);
            setImgLoading(true);
            setShowSpinner(false);

            // Trì hoãn hiển thị Spin 150ms. Nếu ảnh đã cache và load rất nhanh thì sẽ không bị nháy Spin.
            const timer = setTimeout(() => {
                if (!isCancelled) setShowSpinner(true);
            }, 150);

            return () => {
                isCancelled = true;
                clearTimeout(timer);
            };
        } else {
            setImgLoading(false);
            setShowSpinner(false);
        }
    }, [node.props.src]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', position: 'relative' }}>
            {imgLoading && showSpinner && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 9999,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(4px)'
                }}>
                    <Spin size="large" tip="Đang tải ảnh gốc qua API..." />
                </div>
            )}

            {/* Component ảnh gốc của antd */}
            {node}

            {/* Thẻ img ẩn dùng để theo dõi khi nào trình duyệt tải xong URL này */}
            {node.props.src && (
                <img
                    src={node.props.src}
                    style={{ display: 'none' }}
                    onLoad={() => setImgLoading(false)}
                    onError={() => setImgLoading(false)}
                    alt="hidden-tracker"
                />
            )}
        </div>
    );
};

const gridComponents = {
    List: React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(({ style, children, ...props }, ref) => (
        <div
            ref={ref}
            {...props}
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '20px',
                ...style,
            }}
        >
            {children}
        </div>
    )),
    Item: React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(({ children, ...rest }, ref) => (
        <div ref={ref} {...rest} style={{ height: '100%', ...rest.style }}>
            {children}
        </div>
    ))
};

const DraggablePanel = ({ imgId, selectedImages, handleSelectImage, imageComments, handleCommentChange }: any) => {
    // Khởi tạo vị trí tịnh tiến (offset) là 0,0 để nó nằm đúng vị trí cũ
    const [offset, setOffset] = React.useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = React.useState(false);
    const dragStart = React.useRef({ x: 0, y: 0 });

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.closest('.ant-checkbox')) {
            return;
        }

        setIsDragging(true);
        // Lưu lại vị trí bắt đầu click chuột trừ đi offset hiện tại
        dragStart.current = {
            x: e.clientX - offset.x,
            y: e.clientY - offset.y
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.stopPropagation();
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;

        const newX = e.clientX - dragStart.current.x;
        const newY = e.clientY - dragStart.current.y;

        setOffset({ x: newX, y: newY });
        e.stopPropagation();
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isDragging) {
            setIsDragging(false);
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    };

    return (
        <div
            style={{
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '15px',
                background: 'rgba(0,0,0,0.6)',
                padding: '12px 20px',
                borderRadius: '8px',
                pointerEvents: 'auto',
                width: 'min(90vw, 500px)',
                zIndex: 9999,
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                touchAction: 'none'
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <Checkbox
                checked={selectedImages.has(imgId)}
                onChange={(e) => handleSelectImage(imgId, e.target.checked)}
                style={{ color: 'white', whiteSpace: 'nowrap', marginTop: '5px' }}
            >
                Chọn ảnh này
            </Checkbox>
            <Input.TextArea
                placeholder="Nhập nhận xét..."
                value={imageComments[imgId] || ''}
                onChange={(e) => handleCommentChange(imgId, e.target.value)}
                autoSize={{ minRows: 2, maxRows: 4 }}
                style={{ flex: 1, cursor: 'text' }}
            />
        </div>
    );
};

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, loading, onLoadMore }) => {
    // Lưu các id ảnh được chọn
    const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
    // Lưu nhận xét của từng ảnh, key là id ảnh
    const [imageComments, setImageComments] = useState<Record<string, string>>({});

    // Quản lý trạng thái mở modal Preview và vị trí ảnh hiện tại
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewCurrent, setPreviewCurrent] = useState(0);

    // Mutation gửi API
    const { mutateAsync: chooseImg, isPending: isSubmitting } = useChooseImg();

    const PUBLIC_URL = import.meta.env.VITE_API_URL_PUBLIC;

    // Build mảng items cho PreviewGroup (chứa toàn bộ ảnh thay vì chỉ ảnh đang render ảo)
    const previewItems = React.useMemo(() => {
        return (images || []).map(img => ({
            src: img.id ? `${PUBLIC_URL}/driver/proxy-image/${img.id}` : (img.url || img.thumbnail)
        }));
    }, [images, PUBLIC_URL]);

    const handleSelectImage = useCallback((id: string, checked: boolean) => {
        setSelectedImages(prev => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    }, []);

    const handleCommentChange = useCallback((id: string, comment: string) => {
        setImageComments(prev => ({
            ...prev,
            [id]: comment
        }));
    }, []);

    const handleSubmit = async () => {
        if (selectedImages.size === 0) {
            message.warning("Vui lòng chọn ít nhất một ảnh để gửi!");
            return;
        }

        const payload = Array.from(selectedImages).map(imgId => ({
            imgId: imgId,
            comment: imageComments[imgId] || ""
        }));

        try {
            await chooseImg(payload);
            message.success(`Đã gửi thành công ${payload.length} ảnh và nhận xét!`);
            // Có thể clear selection nếu muốn sau khi gửi thành công
            // setSelectedImages(new Set());
            // setImageComments({});
        } catch (error) {
            console.error("Lỗi khi gửi ảnh:", error);
            message.error("Gửi dữ liệu thất bại. Vui lòng thử lại sau!");
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0', marginTop: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                <Spin size="large" tip="Đang tải hình ảnh..." />
            </div>
        );
    }

    if (!images || images.length === 0) {
        return <Empty description="Chưa có hình ảnh nào" style={{ marginTop: '50px' }} />;
    }

    return (
        <div style={{ padding: '20px', backgroundColor: '#f9f9f9', marginTop: '20px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <Title level={3} style={{ margin: 0 }}>
                    Thư viện hình ảnh
                </Title>
                <Button
                    type="primary"
                    size="large"
                    onClick={handleSubmit}
                    loading={isSubmitting}
                    disabled={selectedImages.size === 0}
                >
                    Gửi yêu cầu ({selectedImages.size} ảnh)
                </Button>
            </div>

            <Image.PreviewGroup
                items={previewItems}
                preview={{
                    visible: previewVisible,
                    current: previewCurrent,
                    onVisibleChange: (vis) => setPreviewVisible(vis),
                    onChange: (current) => {
                        setPreviewCurrent(current);
                        // Kích hoạt load tiếp nếu người dùng xem đến gần cuối danh sách (cách 3 ảnh)
                        if (current >= images.length - 3 && onLoadMore) {
                            onLoadMore();
                        }
                    },
                    imageRender: (node) => <CustomImagePreview node={node} />,
                    toolbarRender: (originalNode) => {
                        // Sử dụng previewCurrent để lấy đúng ảnh đang xem (chính xác hơn nhiều so với việc parse src)
                        const img = images[previewCurrent];
                        if (!img) return originalNode;
                        const imgId = img.id || img.url;


                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                                <DraggablePanel
                                    imgId={imgId}
                                    selectedImages={selectedImages}
                                    handleSelectImage={handleSelectImage}
                                    imageComments={imageComments}
                                    handleCommentChange={handleCommentChange}
                                />
                                {originalNode}
                            </div>
                        );
                    }
                }}
            >
                <VirtuosoGrid
                    useWindowScroll
                    data={images}
                    endReached={() => {
                        if (onLoadMore) {
                            onLoadMore();
                        }
                    }}
                    components={gridComponents}
                    itemContent={(index, img) => {
                        const imgId = img.id || img.url || index.toString();
                        return (
                            <Card
                                key={imgId}
                                hoverable
                                style={{ borderRadius: '12px', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}
                                styles={{ body: { padding: '12px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '10px' } }}
                                cover={
                                    <div style={{ position: 'relative', height: '320px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
                                        {/* Checkbox chọn ảnh */}
                                        <Checkbox
                                            checked={selectedImages.has(imgId)}
                                            onChange={(e) => handleSelectImage(imgId, e.target.checked)}
                                            style={{
                                                position: 'absolute',
                                                top: '10px',
                                                left: '10px',
                                                zIndex: 10,
                                                transform: 'scale(1.5)'
                                            }}
                                        />
                                        <Image
                                            alt={img.name || 'Image'}
                                            loading="lazy"
                                            src={img.id ? `${PUBLIC_URL}/driver/proxy-image/${img.id}` : (img.url || img.thumbnail)}
                                            preview={false} // Tắt preview mặc định, sẽ tự quản lý
                                            onClick={() => {
                                                setPreviewCurrent(index);
                                                setPreviewVisible(true);
                                                // Nếu mở ảnh ở vị trí gần cuối, gọi load thêm ngay lập tức để người dùng không bị kẹt ở nút Next
                                                if (index >= images.length - 5 && onLoadMore) {
                                                    onLoadMore();
                                                }
                                            }}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                            fallback="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                                        />
                                    </div>
                                }
                            >
                                <Card.Meta
                                    title={<Text strong ellipsis>{img.name || 'Không có tên'}</Text>}
                                />
                                {/* Khung nhập nhận xét */}
                                <Input.TextArea
                                    placeholder="Nhập nhận xét..."
                                    value={imageComments[imgId] || ''}
                                    onChange={(e) => handleCommentChange(imgId, e.target.value)}
                                    autoSize={{ minRows: 2, maxRows: 4 }}
                                    style={{ marginTop: 'auto' }}
                                />
                            </Card>
                        );
                    }}
                />
            </Image.PreviewGroup>

            {/* Render các thẻ img ẩn để trình duyệt tải trước (preload) các ảnh tiếp theo vào cache */}
            {previewVisible && (
                <div style={{ display: 'none' }}>
                    {previewItems.slice(previewCurrent + 1, previewCurrent + 4).map((item, i) => (
                        <img key={i} src={item.src} alt="preload" />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ImageGallery;

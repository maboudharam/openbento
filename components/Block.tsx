import React, { useEffect, useState, useRef } from 'react';
import { BlockData, BlockType } from '../types';
import { ArrowUpRight, MapPin, Type, Image as ImageIcon, Link as LinkIcon, Twitter, Github, Linkedin, Youtube, Instagram, GripHorizontal, MoveVertical, Play, Loader2, ExternalLink, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { getSocialPlatformOption, inferSocialPlatformFromUrl } from '../socialPlatforms';

interface BlockProps {
  block: BlockData;
  isSelected: boolean;
  isDragTarget?: boolean;
  isDragging?: boolean;
  onEdit: (block: BlockData) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnter: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (id: string) => void;
  enableResize?: boolean;
  isResizing?: boolean;
  onResizeStart?: (block: BlockData, e: React.PointerEvent<HTMLButtonElement>) => void;
  onInlineUpdate?: (block: BlockData) => void;
}

const Block: React.FC<BlockProps> = ({
  block,
  isSelected,
  isDragTarget,
  isDragging,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
  enableResize,
  isResizing,
  onResizeStart,
  onInlineUpdate,
}) => {
  const [fetchedVideos, setFetchedVideos] = useState<Array<{ id: string; title: string; thumbnail: string }>>(block.youtubeVideos || []);
  const [isLoading, setIsLoading] = useState(false);

  // Inline editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingSubtext, setIsEditingSubtext] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(block.title || '');
  const [editSubtextValue, setEditSubtextValue] = useState(block.subtext || '');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const subtextInputRef = useRef<HTMLInputElement>(null);

  // Update local state when block changes
  useEffect(() => {
    setEditTitleValue(block.title || '');
    setEditSubtextValue(block.subtext || '');
  }, [block.title, block.subtext]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingSubtext && subtextInputRef.current) {
      subtextInputRef.current.focus();
      subtextInputRef.current.select();
    }
  }, [isEditingSubtext]);

  const handleTitleSave = () => {
    if (onInlineUpdate && editTitleValue !== block.title) {
      onInlineUpdate({ ...block, title: editTitleValue });
    }
    setIsEditingTitle(false);
  };

  const handleSubtextSave = () => {
    if (onInlineUpdate && editSubtextValue !== block.subtext) {
      onInlineUpdate({ ...block, subtext: editSubtextValue });
    }
    setIsEditingSubtext(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditTitleValue(block.title || '');
      setIsEditingTitle(false);
    }
  };

  const handleSubtextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubtextSave();
    } else if (e.key === 'Escape') {
      setEditSubtextValue(block.subtext || '');
      setIsEditingSubtext(false);
    }
  };

  useEffect(() => {
    if (block.type === BlockType.SOCIAL && block.channelId && (!block.youtubeVideos || block.youtubeVideos.length === 0)) {
        let isMounted = true;
        const fetchFeed = async () => {
            setIsLoading(true);
            try {
                const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${block.channelId}`;
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
                const response = await fetch(proxyUrl);
                if (response.ok && isMounted) {
                    const text = await response.text();
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(text, "text/xml");
                    const entries = Array.from(xmlDoc.querySelectorAll("entry"));
                    const vids = entries.slice(0, 4).map(entry => {
                        const vidId = entry.getElementsByTagName("yt:videoId")[0]?.textContent || "";
                        const vidTitle = entry.getElementsByTagName("title")[0]?.textContent || "";
                        return {
                            id: vidId,
                            title: vidTitle,
                            thumbnail: `https://img.youtube.com/vi/${vidId}/mqdefault.jpg`
                        };
                    });
                    if (vids.length > 0) setFetchedVideos(vids);
                }
            } catch (e) {
                console.warn("Auto-fetch warning:", e);
            } finally {
                if(isMounted) setIsLoading(false);
            }
        };
        fetchFeed();
        return () => { isMounted = false; };
    } else {
        setFetchedVideos(block.youtubeVideos || []);
    }
  }, [block.channelId, block.youtubeVideos, block.type]);


  const getIcon = () => {
    switch (block.type) {
      case BlockType.SOCIAL:
        if (block.channelId || block.title?.toLowerCase().includes('youtube') || block.content?.includes('youtube') || block.content?.includes('youtu.be')) {
          return <Youtube className="w-5 h-5" />;
        }

        {
          const platform = block.socialPlatform ?? inferSocialPlatformFromUrl(block.content);
          const PlatformIcon = platform ? getSocialPlatformOption(platform)?.icon : undefined;
          if (PlatformIcon) return <PlatformIcon className="w-5 h-5" />;
        }

        // Backward-compatible heuristics for older saved data
        if (block.content?.includes('twitter') || block.content?.includes('x.com')) return <Twitter className="w-5 h-5" />;
        if (block.content?.includes('github')) return <Github className="w-5 h-5" />;
        if (block.content?.includes('linkedin')) return <Linkedin className="w-5 h-5" />;
        if (block.content?.includes('instagram')) return <Instagram className="w-5 h-5" />;
        return <LinkIcon className="w-5 h-5" />;
      case BlockType.MAP: return <MapPin className="w-5 h-5" />;
      case BlockType.MEDIA: return <ImageIcon className="w-5 h-5" />;
      case BlockType.TEXT: return <Type className="w-5 h-5" />;
      case BlockType.SPACER: return <MoveVertical className="w-5 h-5" />;
      default: return <LinkIcon className="w-5 h-5" />;
    }
  };

  const colClass = block.colSpan === 3 ? 'md:col-span-3 lg:col-span-3' : block.colSpan === 2 ? 'md:col-span-2 lg:col-span-2' : 'md:col-span-1 lg:col-span-1';
  const rowClass = block.rowSpan === 2 ? 'md:row-span-2' : 'md:row-span-1';

  // Calculate border-radius based on block size (smaller = more rectangular)
  const getBorderRadius = () => {
    const minDim = Math.min(block.colSpan, block.rowSpan);
    if (minDim <= 1) return '0.5rem'; // 8px for tiny blocks
    if (minDim <= 2) return '0.625rem'; // 10px for small blocks
    if (minDim <= 3) return '0.75rem'; // 12px for medium blocks
    return '0.875rem'; // 14px for large blocks
  };
  const borderRadius = getBorderRadius();

  const resizeHandle =
    enableResize && onResizeStart ? (
      <button
        type="button"
        aria-label="Resize block"
        data-resize-handle="true"
        className={`absolute bottom-2 right-2 z-30 transition-opacity pointer-events-auto ${
          isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(block, e);
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragStart={(e) => e.preventDefault()}
      >
        <div className="w-6 h-6 rounded-lg bg-white/90 border border-white shadow-md flex items-end justify-end p-1 cursor-nwse-resize touch-none">
          <div className="w-3 h-3 border-b-2 border-r-2 border-gray-900/70" />
        </div>
      </button>
    ) : null;
  
  // Explicit grid positioning (if defined)
  const gridPositionStyle: React.CSSProperties = {};
  if (block.gridColumn !== undefined) {
    gridPositionStyle.gridColumnStart = block.gridColumn;
    gridPositionStyle.gridColumnEnd = block.gridColumn + block.colSpan;
  }
  if (block.gridRow !== undefined) {
    gridPositionStyle.gridRowStart = block.gridRow;
    gridPositionStyle.gridRowEnd = block.gridRow + block.rowSpan;
  }
  // Z-index for overlapping blocks
  if (block.zIndex !== undefined) {
    gridPositionStyle.zIndex = block.zIndex;
  }

	  // Spacer Block
	  if (block.type === BlockType.SPACER) {
	      return (
        <motion.div
            layoutId={block.id}
            layout
            draggable={!isResizing}
            onDragStart={(e) => {
              if (isResizing) {
                e.preventDefault();
                return;
              }
              if ((e.target as HTMLElement)?.closest('[data-resize-handle="true"]')) {
                e.preventDefault();
                return;
              }
              onDragStart(block.id);
            }}
            onDragEnter={() => onDragEnter(block.id)}
            onDragOver={(e) => e.preventDefault()}
            onDragEnd={onDragEnd}
            onDrop={(e) => { e.preventDefault(); onDrop(block.id); }}
            onClick={() => onEdit(block)}
            data-block-id={block.id}
            className={`
                relative ${colClass} ${rowClass} cursor-pointer
                ${isSelected ? 'ring-2 ring-blue-500/50 bg-blue-50/50' : 'hover:bg-gray-100/50'}
                ${isDragTarget ? 'ring-2 ring-violet-500 bg-violet-50/50 scale-[1.02]' : ''}
                ${isDragging ? 'opacity-40 scale-95' : ''}
	                transition-all duration-200 group
	                flex items-center justify-center
	            `}
	            style={{ minHeight: '40px', borderRadius, ...gridPositionStyle }}
	        >
	             <div className={`text-gray-300 flex flex-col items-center gap-1 ${isSelected || isDragTarget ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
	                 <MoveVertical size={20} />
	                 <span className="text-xs font-medium uppercase tracking-wider">Spacer</span>
	             </div>
	             {resizeHandle}
	        </motion.div>
	      );
	  }

  // Social Icon Block (small, icon-only)
  if (block.type === BlockType.SOCIAL_ICON) {
    const platform = block.socialPlatform;
    const handle = block.socialHandle || '';
    const option = platform ? getSocialPlatformOption(platform) : undefined;
    const BrandIcon = option?.brandIcon;
    const FallbackIcon = option?.icon;
    const brandColor = option?.brandColor;
    const url = option && handle ? option.buildUrl(handle) : '';

    // Determine if we should show colored or grey/black icon
    // Use brand color by default, but respect textColor if explicitly set
    const useColor = !block.textColor || block.textColor === 'text-brand';
    const iconColor = useColor
      ? brandColor
      : block.textColor === 'text-black'
        ? '#000000'
        : block.textColor === 'text-gray-700'
          ? '#374151'
          : undefined;

    return (
      <motion.a
        layoutId={block.id}
        layout
        href={url || undefined}
        target="_blank"
        rel="noopener noreferrer"
        draggable={!isResizing}
        onDragStart={(e) => {
          if (isResizing) {
            e.preventDefault();
            return;
          }
          if ((e.target as HTMLElement)?.closest('[data-resize-handle="true"]')) {
            e.preventDefault();
            return;
          }
          onDragStart(block.id);
        }}
        onDragEnter={() => onDragEnter(block.id)}
        onDragOver={(e) => e.preventDefault()}
        onDragEnd={onDragEnd}
        onDrop={(e) => { e.preventDefault(); onDrop(block.id); }}
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey) return; // Allow link click
          e.preventDefault();
          onEdit(block);
        }}
        data-block-id={block.id}
        className={`
          relative cursor-pointer overflow-hidden
          ${block.color || 'bg-white'}
          ${isSelected ? 'ring-2 ring-violet-500 shadow-lg' : 'hover:ring-2 hover:ring-gray-300 hover:shadow-md'}
          ${isDragTarget ? 'ring-2 ring-violet-500 bg-violet-50/50 scale-105' : ''}
          ${isDragging ? 'opacity-40 scale-95' : ''}
          transition-all duration-200 group
          flex items-center justify-center
          shadow-sm border border-gray-100
        `}
        style={{
          ...gridPositionStyle,
          borderRadius,
          ...(block.customBackground ? { background: block.customBackground } : {}),
        }}
      >
        {BrandIcon ? (
          <BrandIcon
            size={24}
            style={{ color: iconColor }}
            className="group-hover:scale-110 transition-transform"
          />
        ) : FallbackIcon ? (
          <FallbackIcon
            size={24}
            style={{ color: iconColor || '#374151' }}
            className="group-hover:scale-110 transition-transform"
          />
        ) : null}
        {resizeHandle}
      </motion.a>
    );
  }

  // YouTube Block Detection
  const activeVideos = fetchedVideos.length > 0 ? fetchedVideos : [];
  const activeVideoId = block.youtubeVideoId || (activeVideos.length > 0 ? activeVideos[0].id : undefined);
  const isYoutube = (block.type === BlockType.SOCIAL && (!!block.channelId || block.title?.toLowerCase().includes('youtube')));
  const isRichYoutube = isYoutube && activeVideoId && block.youtubeMode !== 'grid' && block.youtubeMode !== 'list';
  const isYoutubeGrid = isYoutube && block.youtubeMode === 'grid';
  const isYoutubeList = isYoutube && block.youtubeMode === 'list';
  
  const isLinkWithImage = block.type === BlockType.LINK && block.imageUrl;

  const backgroundStyle: React.CSSProperties = block.customBackground 
    ? { background: block.customBackground } 
    : {};
  
  let finalStyle: React.CSSProperties = backgroundStyle;
  
  if (isRichYoutube) {
      finalStyle = { 
        backgroundImage: `url(https://img.youtube.com/vi/${activeVideoId}/maxresdefault.jpg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
  } else if (isLinkWithImage && block.imageUrl) {
      finalStyle = {
        backgroundImage: `url(${block.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
  }

  // ===== YOUTUBE GRID/LIST LAYOUT (ADAPTIVE) =====
  if (isYoutubeGrid || isYoutubeList) {
    // Adaptive layout based on block size
    const isLargeBlock = block.colSpan >= 2 && block.rowSpan >= 2; // 2x2 or larger
    const isWideBlock = block.colSpan >= 2 && block.rowSpan === 1; // 2x1
    const isTallBlock = block.colSpan === 1 && block.rowSpan >= 2; // 1x2
    const isSmallBlock = block.colSpan === 1 && block.rowSpan === 1; // 1x1
    
    // Determine display mode based on size
    const showTitles = isLargeBlock || isTallBlock;
    const videosToShow = isSmallBlock ? 2 : (isWideBlock ? 2 : 4);
    const displayVideos = activeVideos.slice(0, videosToShow);
    
    // Grid configuration
    const getGridClass = () => {
      if (isSmallBlock) return 'grid grid-cols-2 gap-1.5';
      if (isWideBlock) return 'grid grid-cols-2 gap-2';
      if (isTallBlock) return 'flex flex-col gap-2';
      return 'grid grid-cols-2 gap-2'; // Large block
    };

	    return (
      <motion.div 
        layoutId={block.id}
        layout
        draggable={!isResizing}
        onDragStart={(e) => {
          if (isResizing) {
            e.preventDefault();
            return;
          }
          if ((e.target as HTMLElement)?.closest('[data-resize-handle="true"]')) {
            e.preventDefault();
            return;
          }
          onDragStart(block.id);
        }}
        onDragEnter={() => onDragEnter(block.id)}
        onDragOver={(e) => e.preventDefault()}
        onDragEnd={onDragEnd}
        onDrop={(e) => { e.preventDefault(); onDrop(block.id); }}
        onClick={() => onEdit(block)}
        data-block-id={block.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        style={{ ...gridPositionStyle, borderRadius }}
        className={`group relative overflow-hidden bg-white ${colClass} ${rowClass} cursor-pointer
          ${isSelected ? 'ring-4 ring-blue-500 shadow-xl z-20' : 'ring-1 ring-black/5'}
          ${!isSelected ? 'shadow-sm hover:shadow-xl' : ''}
          ${isDragTarget ? 'ring-2 ring-violet-500 z-20 scale-[1.02]' : ''}
          ${isDragging ? 'opacity-40 scale-95' : ''}
          transition-all duration-300 select-none
        `}
      >
        {/* Drop indicator */}
        {isDragTarget && (
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-16 bg-violet-500 rounded-full shadow-md shadow-violet-500/30 animate-pulse z-30" />
        )}
	        <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 z-20 pointer-events-none">
	            <GripHorizontal size={20} />
	        </div>
	        {resizeHandle}

	        <div className={`w-full h-full pointer-events-none flex flex-col ${isSmallBlock ? 'p-3' : 'p-4'}`}>
          {/* YouTube Header - Compact for small blocks */}
          <div className={`flex items-center gap-2 ${isSmallBlock ? 'mb-2 pb-2' : 'mb-3 pb-3'} border-b border-gray-100`}>
            <div className={`${isSmallBlock ? 'w-7 h-7 rounded-lg' : 'w-9 h-9 rounded-xl'} bg-red-600 text-white flex items-center justify-center shadow-sm shrink-0`}>
              <Youtube size={isSmallBlock ? 14 : 18}/>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`${isSmallBlock ? 'text-xs' : 'text-sm'} font-bold text-gray-900 truncate`}>{block.channelTitle || 'YouTube'}</h3>
              {!isSmallBlock && <span className="text-[10px] text-gray-400 font-medium">Latest Videos</span>}
            </div>
            {!isSmallBlock && <ExternalLink size={14} className="text-gray-300 group-hover:text-red-500 transition-colors shrink-0" />}
          </div>

          {/* Videos Content - Adaptive */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-gray-300" size={isSmallBlock ? 18 : 24}/>
            </div>
          ) : (
            <div className={`flex-1 ${getGridClass()} overflow-hidden`}>
              {displayVideos.length > 0 ? displayVideos.map((vid, idx) => (
                <div 
                  key={idx} 
                  className={`relative overflow-hidden group/vid transition-all duration-200 rounded-lg bg-gray-100 ${
                    isTallBlock ? 'flex gap-2' : ''
                  }`}
                  style={!isTallBlock ? { aspectRatio: isSmallBlock ? '16/10' : '16/9' } : { height: isLargeBlock ? '23%' : '48px' }}
                >
                  {isTallBlock ? (
                    /* Tall block - horizontal list items */
                    <>
                      <div className="w-20 h-full shrink-0 relative overflow-hidden bg-gray-200">
                        <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/vid:opacity-100 transition-opacity">
                          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                            <Play size={10} className="text-white ml-0.5" fill="white" />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 py-1 pr-2 flex items-center min-w-0">
                        <p className="text-[11px] font-medium text-gray-700 line-clamp-2 leading-tight">{vid.title}</p>
                      </div>
                    </>
                  ) : (
                    /* Grid items */
                    <>
                      <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/35" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/vid:opacity-100 transition-all duration-200">
                        <div className={`${isSmallBlock ? 'w-7 h-7' : 'w-9 h-9'} rounded-full bg-red-500 flex items-center justify-center shadow-lg`}>
                          <Play size={isSmallBlock ? 12 : 16} className="text-white ml-0.5" fill="white" />
                        </div>
                      </div>
                      {showTitles && (
                        <div className="absolute bottom-0 left-0 right-0 p-1.5">
                          <p className={`${isSmallBlock ? 'text-[9px]' : 'text-[10px]'} text-white font-medium line-clamp-1 leading-tight drop-shadow-md`}>{vid.title}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )) : (
                <div className="col-span-2 flex items-center justify-center text-xs text-gray-400 py-4">
                  <span>No videos</span>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ===== STANDARD BLOCKS =====
  return (
    <motion.div 
      layoutId={block.id}
      layout
      draggable={!isResizing}
      onDragStart={(e) => {
        if (isResizing) {
          e.preventDefault();
          return;
        }
        if ((e.target as HTMLElement)?.closest('[data-resize-handle="true"]')) {
          e.preventDefault();
          return;
        }
        onDragStart(block.id);
      }}
      onDragEnter={() => onDragEnter(block.id)}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      onDrop={(e) => { e.preventDefault(); onDrop(block.id); }}
      onClick={() => onEdit(block)}
      data-block-id={block.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      style={{ ...finalStyle, ...gridPositionStyle, borderRadius }}
      className={`group relative overflow-hidden ${!block.customBackground && !isLinkWithImage && !isRichYoutube ? (block.color || 'bg-white') : ''} ${block.textColor || 'text-gray-900'} ${colClass} ${rowClass} cursor-pointer
        ${isSelected ? 'ring-4 ring-blue-500 shadow-xl z-20' : 'ring-1 ring-black/5'}
        ${!isSelected ? 'shadow-sm hover:shadow-xl' : ''}
        ${isDragTarget ? 'ring-2 ring-violet-500 z-20 scale-[1.02]' : ''}
        ${isDragging ? 'opacity-40 scale-95' : ''}
        transition-all duration-300 select-none
      `}
    >
      {/* Drop indicator */}
      {isDragTarget && (
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-16 bg-violet-500 rounded-full shadow-md shadow-violet-500/30 animate-pulse z-30" />
      )}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-current/30 z-20 pointer-events-none">
          <GripHorizontal size={20} />
      </div>
      {resizeHandle}

      {/* Gradient overlay for image backgrounds - only when there's text */}
      {(isRichYoutube || isLinkWithImage) && (block.title || block.subtext || block.channelTitle) && (
         <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-0 pointer-events-none" />
      )}

      <div className="w-full h-full pointer-events-none relative z-10">
        
        {/* MEDIA BLOCK (Image/Video/GIF) */}
        {block.type === BlockType.MEDIA && block.imageUrl && !isLinkWithImage ? (
          <div className="w-full h-full relative overflow-hidden">
              {/* Check if it's a video or gif */}
              {/\.(mp4|webm|ogg|mov)$/i.test(block.imageUrl) ? (
                <video
                  src={block.imageUrl}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={block.imageUrl}
                  alt={block.title || ''}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              {/* Subtle gradient from bottom for optional text */}
              {block.title && (
                <>
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-white font-semibold text-sm drop-shadow-lg">{block.title}</p>
                    {block.subtext && <p className="text-white/80 text-xs mt-0.5">{block.subtext}</p>}
                  </div>
                </>
              )}
          </div>
        ) : block.type === BlockType.MAP ? (
          /* MAP BLOCK */
          <div className="w-full h-full relative bg-gray-100 overflow-hidden">
              <iframe 
                  width="100%" 
                  height="100%" 
                  className="opacity-90 grayscale-[30%] group-hover:grayscale-0 transition-all duration-500"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(block.content || 'Paris')}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                  loading="lazy"
              ></iframe>
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-black/60 text-white">
                  <p className="font-bold text-lg flex items-center gap-2"><MapPin size={18}/> {block.title}</p>
              </div>
          </div>
        ) : isRichYoutube ? (
          /* YOUTUBE SINGLE VIDEO */
          <div className="w-full h-full flex flex-col justify-between p-6">
            {/* Top: YouTube Icon */}
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg">
                <Youtube size={22}/>
              </div>
            </div>

            {/* Center: Play Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-2xl shadow-red-500/30 transform group-hover:scale-110 transition-transform duration-300">
                <Play size={28} className="text-white ml-1" fill="white" />
              </div>
            </div>

            {/* Bottom: Info */}
            <div className="mt-auto">
              <div className="-mx-6 -mb-6 p-5">
                <h3 className="font-bold text-white text-lg leading-tight drop-shadow-lg">{block.channelTitle || block.title}</h3>
                {block.subtext && <p className="text-white/80 text-sm mt-1 font-medium drop-shadow">{block.subtext}</p>}
              </div>
            </div>
          </div>
        ) : (
          /* DEFAULT BLOCK (Link, Social, Text) */
          <div className="p-6 h-full flex flex-col justify-between relative">
            <div className="flex justify-between items-start">
               {/* Only show icon for SOCIAL blocks, not LINK or TEXT */}
               {block.type === BlockType.SOCIAL && (
                 <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm ${
                   block.textColor === 'text-white' || isLinkWithImage
                     ? 'bg-white/20 text-white backdrop-blur-md'
                     : 'bg-white/90 shadow-md'
                 }`}>
                   {getIcon()}
                 </div>
               )}
               {(block.type === BlockType.LINK || block.type === BlockType.SOCIAL) && (
                   <div className={`opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1 group-hover:-translate-y-1 ${
                     block.textColor === 'text-white' || isLinkWithImage ? 'text-white' : 'text-gray-400'
                   }`}>
                     <ArrowUpRight size={24} />
                   </div>
               )}
            </div>

            <div className={`${block.type === BlockType.TEXT ? 'flex flex-col justify-center h-full' : 'mt-auto'}`}>
              {/* Editable Title */}
              <div className="group/title relative">
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editTitleValue}
                    onChange={(e) => setEditTitleValue(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={handleTitleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className={`font-bold leading-tight tracking-tight bg-transparent border-b-2 border-violet-500 outline-none w-full pointer-events-auto ${block.type === BlockType.TEXT ? 'text-2xl mb-2' : 'text-lg'} ${isLinkWithImage ? 'text-white' : ''}`}
                    placeholder="Title..."
                  />
                ) : (
                  <h3
                    className={`font-bold leading-tight tracking-tight cursor-text ${block.type === BlockType.TEXT ? 'text-2xl mb-2' : 'text-lg'} ${isLinkWithImage ? 'text-white drop-shadow-lg' : ''}`}
                    onClick={(e) => {
                      if (onInlineUpdate) {
                        e.stopPropagation();
                        setIsEditingTitle(true);
                      }
                    }}
                  >
                    {block.channelTitle || block.title || <span className="opacity-40 italic">Add title...</span>}
                    {onInlineUpdate && !block.channelTitle && (
                      <Pencil size={12} className="inline-block ml-2 opacity-0 group-hover/title:opacity-50 transition-opacity" />
                    )}
                  </h3>
                )}
              </div>

              {/* Editable Subtext */}
              <div className="group/subtext relative">
                {isEditingSubtext ? (
                  <input
                    ref={subtextInputRef}
                    type="text"
                    value={editSubtextValue}
                    onChange={(e) => setEditSubtextValue(e.target.value)}
                    onBlur={handleSubtextSave}
                    onKeyDown={handleSubtextKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-sm font-medium bg-transparent border-b-2 border-violet-500 outline-none w-full pointer-events-auto mt-1 ${isLinkWithImage ? 'text-white/70' : 'opacity-60'}`}
                    placeholder="Subtitle..."
                  />
                ) : (
                  (block.subtext || onInlineUpdate) && (
                    <p
                      className={`text-sm mt-1 font-medium cursor-text ${isLinkWithImage ? 'text-white/80 drop-shadow' : 'opacity-60'}`}
                      onClick={(e) => {
                        if (onInlineUpdate) {
                          e.stopPropagation();
                          setIsEditingSubtext(true);
                        }
                      }}
                    >
                      {block.subtext || <span className="opacity-40 italic text-xs">Add subtitle...</span>}
                      {onInlineUpdate && (
                        <Pencil size={10} className="inline-block ml-1.5 opacity-0 group-hover/subtext:opacity-50 transition-opacity" />
                      )}
                    </p>
                  )
                )}
              </div>

              {block.type === BlockType.TEXT && block.content && (
                  <p className="opacity-70 mt-2 whitespace-pre-wrap leading-relaxed">{block.content}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Block;

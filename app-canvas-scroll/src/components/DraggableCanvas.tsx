import { useRef, useEffect } from "react";

const SLIDERRANGE_MM = {
    min: -10,
    max: 10,
};
type Point = {
    x: number;
    y: number;
};
export function DraggableCanvas() {
    // canvasへのref
    const refCanvas = useRef<HTMLCanvasElement>(null);
    // input rangeへのref
    const refRange = useRef<HTMLInputElement>(null);


    useEffect(() => {
        const canvas = refCanvas.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;
        const range = refRange.current;
        if (!range) return;

        // 座標系Bの原点
        let originB: Point = {x: 50, y: 50};

        // 拡大率
        let scale: number = 1.0;

        // ドラッグしている状態
        let isDragging: boolean = false;
        // ドラッグの開始位置
        let dragStartPoint: Point | null = null;

        // 描画
        function draw(paramOriginB?: Point) {
            if (!canvas) return;
            if (!context) return;
            
            // この関数で使うoriginBを設定
            // パラメータがあればそれを、なければoriginBを使う
            const curOriginB = paramOriginB? paramOriginB: originB;

            // 初期化
            context.clearRect(0, 0, canvas.width, canvas.height);

            context.lineWidth = 10;
            context.beginPath();
            context.moveTo(curOriginB.x, curOriginB.y);
            context.lineTo(curOriginB.x + 50*scale, curOriginB.y);
            context.moveTo(curOriginB.x, curOriginB.y);
            context.lineTo(curOriginB.x, curOriginB.y + 100*scale);
            context.stroke();
        }
        draw();

        function handleMouseDown(event: MouseEvent){
            console.log("mouseDown");

            // ドラッグ開始
            isDragging = true;
            dragStartPoint = {x: event.clientX, y: event.clientY};
        }
        function handleMouseMove(event: MouseEvent){
            console.log("mouseMove");
            if (!isDragging) return;

            // 今のoriginBを取得
            const movingOriginB = getOriginBDragging({x: event.clientX, y: event.clientY}); 
            if (!movingOriginB) return;

            // 描画
            draw(movingOriginB)
        }
        function handleMouseUp(event: MouseEvent){
            console.log("mouseUp");

            // 今のoriginBを取得
            const finalOriginB = getOriginBDragging({x: event.clientX, y: event.clientY}); 
            if (!finalOriginB) return;

            // originBを更新
            originB = finalOriginB;

            // ドラッグ終了
            isDragging = false;
            dragStartPoint = null;
        }
        function handleMouseWheel(event: WheelEvent){
            if (!range) return;

            // マウスホイールの方向による更新値
            const wheelUp = (event.deltaY<0)? 1: -1;

            // 今のinputRangeから１つ上げ下げする
            const newInputRangeValue = range.valueAsNumber + wheelUp;
            range.value = String(newInputRangeValue);

            // inputRangeValueからscale値に変換
            const newScale: number = rangeValue2Scale(
                newInputRangeValue
            );

            // マウス位置を中心に拡大縮小
            zoomAround(
                newScale,
                {x: event.clientX, y: event.clientY}
            );
            
            // 再描画
            draw();
        }
        function handleRangeChange(){
            if (!range) return;

            // 値から拡大率を計算
            const newScale = rangeValue2Scale(range.valueAsNumber);
            // 拡大縮小
            zoomAround(newScale);

            // 再描画
            draw();
        }
        
        // ドラッグ中のoriginBを返す
        function getOriginBDragging(curMousePos: Point): Point|void{
            if (!isDragging) return;
            if (!dragStartPoint) return;

            return {
                x: originB.x + curMousePos.x - dragStartPoint.x,
                y: originB.y + curMousePos.y - dragStartPoint.y,
            };
        }

        // 拡大によるoriginBとscale値の更新
        function zoomAround(newScale: number, propCenter?: Point){
            if (!refCanvas) return;
            if (!refCanvas.current) return;
    
            // 拡大中心点（座標系A）
            const zoomCenter: Point = propCenter
                ? propCenter
                : {x: refCanvas.current.width/2, y: refCanvas.current.height/2}
            ;
    
            // 拡大中心点→originBinAを、newScale/scale 倍した先が新しいoriginBinAとなる
            // zoomCenter → OriginB ベクトル
            const vecZC2OB: Point = {
                x: (originB.x - zoomCenter.x) * newScale / scale,
                y: (originB.y - zoomCenter.y) * newScale / scale,
            };
    
            // 新しいoriginBの座標値
            const newOriginB = {
                x: zoomCenter.x + vecZC2OB.x,
                y: zoomCenter.y + vecZC2OB.y,
            };
    
            // 計算結果で更新
            originB = newOriginB;
            scale = newScale;
        }

        canvas.addEventListener("mousedown", handleMouseDown);
        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("mouseup", handleMouseUp);
        canvas.addEventListener("mouseleave", handleMouseUp);
        canvas.addEventListener("wheel", handleMouseWheel);
        range.addEventListener("input", handleRangeChange);
        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('mouseleave', handleMouseUp);
            canvas.removeEventListener("wheel", handleMouseWheel);
            range.removeEventListener('input', handleRangeChange);
        };
    }, []);

    return (
        <div style={{display:"flex",flexDirection:"column", alignItems: "flex-start", padding: "10px"}}>
            <canvas
                ref={refCanvas}
                width={300}
                height={200}
                style={{border: "1px solid #000"}}
            />
            <input
                type="range"
                ref={refRange}
                min={SLIDERRANGE_MM.min}
                max={SLIDERRANGE_MM.max}
                defaultValue={0}
            />
        </div>
    )
}

// スライドバーのスケール値から、座標系Bのscale値へ変換する
function rangeValue2Scale(value: number) {
    return Math.pow(10, value/10);
}

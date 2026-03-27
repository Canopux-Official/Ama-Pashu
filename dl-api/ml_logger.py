import os
import json
import time
from datetime import datetime
from typing import Dict, Any

class MLLogger:
    def __init__(self, log_dir: str = "ml_logs"):
        self.log_dir = log_dir
        if not os.path.exists(self.log_dir):
            os.makedirs(self.log_dir, exist_ok=True)
            
        self.log_file = os.path.join(self.log_dir, "inference_logs.jsonl")

    def log_inference(
        self, 
        job_type: str, 
        cow_id: str, 
        farmer_id: str,
        match_status: str,
        inference_time_ms: float,
        best_distance: float = None,
        matched_cow_id: str = None,
        num_crops: int = 0,
        muzzle_img_url: str = None,
        face_img_url: str = None,
        muzzle_conf_m: float = None,
        muzzle_conf_f: float = None,
        spoof_prob_m: float = None,
        spoof_prob_f: float = None,
    ):
        """Log telemetry data for future model improving and debugging."""
        telemetry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "job_type": job_type,
            "cow_id": cow_id,
            "farmer_id": farmer_id,
            "match_status": match_status,
            "inference_time_ms": round(inference_time_ms, 2),
            "confidence_score": round((1 - best_distance) * 100, 2) if best_distance is not None else None,
            "distance": best_distance,
            "matched_cow_id": matched_cow_id,
            "num_crops_extracted": num_crops,
            "is_false_match_suspected": match_status == "DISPUTE",
            "muzzle_img_url": muzzle_img_url,
            "face_img_url": face_img_url,
            "muzzle_conf_m": round(muzzle_conf_m, 4) if muzzle_conf_m is not None else None,
            "muzzle_conf_f": round(muzzle_conf_f, 4) if muzzle_conf_f is not None else None,
            "spoof_prob_m": round(spoof_prob_m, 4) if spoof_prob_m is not None else None,
            "spoof_prob_f": round(spoof_prob_f, 4) if spoof_prob_f is not None else None,
            "muzzle_threshold": 0.75,
            "spoof_threshold": 0.3
        }
        
        try:
            if not os.path.exists(self.log_dir):
                os.makedirs(self.log_dir, exist_ok=True)
            with open(self.log_file, "a") as f:
                f.write(json.dumps(telemetry) + "\n")
        except Exception as e:
            print(f"Warning: Failed to write ML log: {e}")

    def generate_html_report(self) -> str:
        """Generates a simple HTML dashboard to view ML metrics."""
        if not os.path.exists(self.log_dir):
            os.makedirs(self.log_dir, exist_ok=True)
        html_path = os.path.join(self.log_dir, "dashboard.html")
        logs = []
        if os.path.exists(self.log_file):
             with open(self.log_file, "r") as f:
                 for line in f:
                     try:
                         logs.append(json.loads(line))
                     except Exception:
                         pass
        
        logs.reverse() # Show newest first

        html = """
        <html>
        <head>
            <title>Ama Pashu - ML Observability Dashboard</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; background: #f4f4f9; color: #333;}
                h1 { color: #2c3e50; }
                table { margin-top: 20px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); white-space: nowrap; }
                th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e1e1e1; font-size: 13px; }
                th { background-color: #f8f9fa; font-weight: 600; color: #495057; }
                tr:hover { background-color: #f8f9fa; }
                .status-SUCCESS { color: #2e7d32; font-weight: bold; }
                .status-DUPLICATE { color: #ed6c02; font-weight: bold; }
                .status-DISPUTE { color: #d32f2f; font-weight: bold; background: #ffebee; padding: 2px 4px; border-radius: 4px;}
                .summary { display: flex; gap: 20px; margin-bottom: 20px; }
                .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex: 1; text-align: center; }
                .card h3 { margin: 0; color: #6c757d; font-size: 14px; text-transform: uppercase; }
                .card p { margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: #2c3e50; }
                .metric { font-family: monospace; background: #f1f3f5; padding: 2px 4px; border-radius: 3px; }
                .pass { color: green; font-weight: bold; }
                .fail { color: red; font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>Ama Pashu - ML Observability Dashboard</h1>
            
            <div class="summary">
                <div class="card"><h3>Total Inferences</h3><p>{total}</p></div>
                <div class="card"><h3>Avg Inference Time</h3><p>{avg_time} ms</p></div>
                <div class="card"><h3>Disputes (False Matches?)</h3><p>{disputes}</p></div>
            </div>

            <div style="overflow-x: auto;">
            <table>
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Type / Status</th>
                        <th>Cow ID</th>
                        <th>Muzzle Input (Img + Scores)</th>
                        <th>Face Input (Img + Scores)</th>
                        <th>Match Conf %</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
        """
        
        total = len(logs)
        disputes = sum(1 for l in logs if l.get("is_false_match_suspected"))
        avg_time = round(sum(l.get("inference_time_ms", 0) for l in logs) / max(1, total), 1)
        
        def format_img_col(url, muzzle_conf, spoof_prob, m_thr, s_thr, job_type, label):
            if not url: return "<td><span style='color:#aaa'>Not Provided</span></td>"
            
            display_url = url
            if not str(url).startswith('http') and not str(url).startswith('file://'):
                display_url = f"/uploads/{url}"
                
            img_html = f"<img src='{display_url}' style='width: 80px; height: 80px; object-fit: cover; border-radius: 4px; display: block; margin-bottom: 4px;' />"
            
            m_html = f"Det: <span class='metric'>{muzzle_conf} (>{m_thr})</span> <span class='{'pass' if muzzle_conf >= m_thr else 'fail'}'>{'YES' if muzzle_conf >= m_thr else 'NO'}</span>" if muzzle_conf is not None else "Det: <span style='color:#aaa'>N/A</span>"
            
            if job_type == 'search':
                s_html = "Spoof: <span style='color:#aaa'>Skip</span>"
            else:
                is_spoof = spoof_prob > s_thr if spoof_prob is not None else False
                s_html = f"Spoof: <span class='metric'>{spoof_prob} (<{s_thr})</span> <span class='{'fail' if is_spoof else 'pass'}'>{'FAIL' if is_spoof else 'PASS'}</span>" if spoof_prob is not None else "Spoof: <span style='color:#aaa'>N/A</span>"
                
            return f"<td>{img_html}<div style='font-size:11px; line-height: 1.4;'>{m_html}<br>{s_html}</div></td>"
            
        for log in logs[:100]: # Limit to last 100
             job = log.get('job_type', '')
             m_thr = log.get('muzzle_threshold', 0.25)
             s_thr = log.get('spoof_threshold', 0.50)
             
             muzzle_col = format_img_col(log.get('muzzle_img_url'), log.get('muzzle_conf_m'), log.get('spoof_prob_m'), m_thr, s_thr, job, 'Muzzle')
             face_col = format_img_col(log.get('face_img_url'), log.get('muzzle_conf_f'), log.get('spoof_prob_f'), m_thr, s_thr, job, 'Face')

             html += f"""
             <tr>
                 <td>{log.get('timestamp', '')[:19].replace('T', ' ')}</td>
                 <td>
                    <strong>{str(job).upper()}</strong><br>
                    <span class="status-{log.get('match_status', '')}">{log.get('match_status', '')}</span>
                 </td>
                 <td style="font-family: monospace;">{log.get('cow_id', '')}</td>
                 {muzzle_col}
                 {face_col}
                 <td><span class="metric" style="font-size:14px;">{log.get('confidence_score', 'N/A')}{'%' if log.get('confidence_score') else ''}</span></td>
                 <td>{log.get('inference_time_ms', 0)} ms</td>
             </tr>
             """
             
        html += """
                </tbody>
            </table>
            </div>
        </body>
        </html>
        """
        
        with open(html_path, "w") as f:
            formatted_html = html.replace("{total}", str(total)).replace("{avg_time}", str(avg_time)).replace("{disputes}", str(disputes))
            f.write(formatted_html)
            
        return html_path

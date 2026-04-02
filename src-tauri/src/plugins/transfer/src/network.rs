use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct NetworkInfo {
    pub lan_ip: String,
}

pub fn get_network_info() -> NetworkInfo {
    NetworkInfo {
        lan_ip: get_local_ip(),
    }
}

pub fn build_read_base_url(tunnel_address: &str, port: u16) -> String {
    if let Some(base_url) = normalize_external_base_url(tunnel_address) {
        return base_url;
    }

    format!("http://{}:{}", get_local_ip(), port)
}

pub fn normalize_external_base_url(value: &str) -> Option<String> {
    let trimmed = value.trim().trim_end_matches('/');

    if trimmed.is_empty() {
        return None;
    }

    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        return Some(trimmed.to_string());
    }

    Some(format!("http://{trimmed}"))
}

/// 获取本机内网 IP
#[cfg(target_os = "windows")]
fn get_local_ip() -> String {
    use ipconfig::{get_adapters, IfType, OperStatus};
    use std::net::{IpAddr, Ipv4Addr, UdpSocket};

    fn is_usable_ipv4(ip: &Ipv4Addr) -> bool {
        !ip.is_loopback() && !ip.is_link_local() && !ip.is_unspecified()
    }

    fn ip_priority(ip: &Ipv4Addr) -> i32 {
        match ip.octets() {
            [192, 168, ..] => 4,
            [10, ..] => 3,
            [172, 16..=31, ..] => 2,
            _ => 1,
        }
    }

    fn adapter_name_penalty(name: &str) -> bool {
        let name = name.to_ascii_lowercase();
        [
            "tailscale",
            "tunnel",
            "tun",
            "tap",
            "vpn",
            "wireguard",
            "virtual",
            "vmware",
            "virtualbox",
            "vbox",
            "hyper-v",
            "hyperv",
            "docker",
            "wsl",
            "loopback",
            "pseudo",
            "bluetooth",
        ]
        .iter()
        .any(|keyword| name.contains(keyword))
    }

    fn adapter_name_preferred(name: &str) -> bool {
        let name = name.to_ascii_lowercase();
        [
            "ethernet",
            "wi-fi",
            "wifi",
            "wlan",
            "wireless",
            "以太网",
            "无线",
            "本地连接",
        ]
        .iter()
        .any(|keyword| name.contains(keyword))
    }

    fn adapter_type_priority(if_type: IfType) -> i32 {
        match if_type {
            IfType::EthernetCsmacd => 3,
            IfType::Ieee80211 => 3,
            IfType::Ppp => -2,
            IfType::Tunnel => -3,
            IfType::SoftwareLoopback => -4,
            _ => 0,
        }
    }

    fn probe_ipv4(target: &str) -> Option<Ipv4Addr> {
        let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
        socket.connect(target).ok()?;

        match socket.local_addr().ok()?.ip() {
            IpAddr::V4(ip)
                if !ip.is_loopback() && !ip.is_link_local() && !ip.is_unspecified() =>
            {
                Some(ip)
            }
            _ => None,
        }
    }

    let mut best: Option<(i32, Ipv4Addr)> = None;

    if let Ok(adapters) = get_adapters() {
        for adapter in adapters {
            if adapter.oper_status() != OperStatus::IfOperStatusUp {
                continue;
            }

            let if_type = adapter.if_type();
            if matches!(if_type, IfType::SoftwareLoopback | IfType::Tunnel) {
                continue;
            }

            let friendly_name = adapter.friendly_name();
            let description = adapter.description();
            if adapter_name_penalty(friendly_name) || adapter_name_penalty(description) {
                continue;
            }

            let preferred_name =
                adapter_name_preferred(friendly_name) || adapter_name_preferred(description);

            let Some(ip) = adapter.ip_addresses().iter().find_map(|ip| match ip {
                IpAddr::V4(ip)
                    if !ip.is_loopback()
                        && !ip.is_link_local()
                        && !ip.is_unspecified()
                        && is_usable_ipv4(ip) =>
                {
                    Some(*ip)
                }
                _ => None,
            }) else {
                continue;
            };

            let has_gateway = adapter
                .gateways()
                .iter()
                .any(|gateway| matches!(gateway, IpAddr::V4(_)));
            let metric = adapter.ipv4_metric() as i32;
            let score = if preferred_name { 10_000_000 } else { 0 }
                + adapter_type_priority(if_type) * 1_000_000
                + if has_gateway { 100_000 } else { 0 }
                + ip_priority(&ip) * 10_000
                - metric.min(9_999);

            match best {
                Some((best_score, _)) if best_score >= score => {}
                _ => best = Some((score, ip)),
            }
        }
    }

    if let Some((_, ip)) = best {
        return ip.to_string();
    }

    let mut probed_best: Option<Ipv4Addr> = None;
    for target in [
        "192.168.0.1:80",
        "10.0.0.1:80",
        "172.16.0.1:80",
        "1.1.1.1:80",
        "8.8.8.8:80",
    ] {
        let Some(ip) = probe_ipv4(target) else {
            continue;
        };

        if !is_usable_ipv4(&ip) {
            continue;
        }

        match probed_best {
            Some(current) if ip_priority(&current) >= ip_priority(&ip) => {}
            _ => probed_best = Some(ip),
        }
    }

    probed_best
        .map(|ip| ip.to_string())
        .unwrap_or_else(|| "127.0.0.1".to_string())
}

#[cfg(not(target_os = "windows"))]
fn get_local_ip() -> String {
    use std::net::{IpAddr, Ipv4Addr, UdpSocket};

    fn is_private_candidate(ip: &Ipv4Addr) -> bool {
        let [a, b, ..] = ip.octets();
        matches!((a, b), (10, _) | (172, 16..=31) | (192, 168))
    }

    fn priority(ip: &Ipv4Addr) -> u8 {
        match ip.octets() {
            [192, 168, ..] => 3,
            [10, ..] => 2,
            [172, 16..=31, ..] => 1,
            _ => 0,
        }
    }

    fn probe_ipv4(target: &str) -> Option<Ipv4Addr> {
        let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
        socket.connect(target).ok()?;

        match socket.local_addr().ok()?.ip() {
            IpAddr::V4(ip)
                if !ip.is_loopback() && !ip.is_link_local() && !ip.is_unspecified() =>
            {
                Some(ip)
            }
            _ => None,
        }
    }

    let mut best: Option<Ipv4Addr> = None;

    for target in [
        "192.168.0.1:80",
        "10.0.0.1:80",
        "172.16.0.1:80",
        "1.1.1.1:80",
        "8.8.8.8:80",
    ] {
        let Some(ip) = probe_ipv4(target) else {
            continue;
        };

        if !is_private_candidate(&ip) {
            continue;
        }

        match best {
            Some(current) if priority(&current) >= priority(&ip) => {}
            _ => best = Some(ip),
        }
    }

    best.map(|ip| ip.to_string())
        .unwrap_or_else(|| "127.0.0.1".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_external_base_url_rejects_blank_values() {
        assert_eq!(normalize_external_base_url(""), None);
        assert_eq!(normalize_external_base_url("   "), None);
    }

    #[test]
    fn normalize_external_base_url_preserves_or_adds_scheme() {
        assert_eq!(
            normalize_external_base_url("https://example.com/base/"),
            Some("https://example.com/base".to_string())
        );
        assert_eq!(
            normalize_external_base_url("example.com:8080"),
            Some("http://example.com:8080".to_string())
        );
    }
}

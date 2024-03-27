#version 300 es

precision mediump float;

in vec2 v_uv;
in float v_ao;
out vec4 fragColor;

uniform sampler2D u_texsheet;

void main() {
	fragColor = vec4(texture(u_texsheet, v_uv).rgb * v_ao, 1);
}
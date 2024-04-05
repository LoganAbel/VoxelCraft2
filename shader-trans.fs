#version 300 es

precision mediump float;

in vec2 v_uv;
in float v_ao;
out vec4 fragColor;

uniform sampler2D u_texsheet;

void main() {
	vec4 tex = texture(u_texsheet, v_uv);
	fragColor = vec4(tex.rgb * v_ao, tex.a);
}
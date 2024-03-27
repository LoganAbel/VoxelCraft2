#version 300 es

layout(location = 0) in vec4 a_pos;
layout(location = 1) in vec2 a_uv;
layout(location = 2) in float a_ao;
out vec2 v_uv;
out float v_ao;

uniform mat4 u_mat;
 
void main() {
   gl_Position = u_mat * a_pos;
   v_uv = a_uv;
   v_ao = a_ao;
}